package com.jumpstart.gamification;

import com.jumpstart.gamification.dto.*;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GamificationService {

    private final StreakRepository streakRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final UserXpRepository userXpRepository;
    private final AchievementRepository achievementRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;

    @Transactional
    public StreakResponse recordActivity(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        Streak streak = streakRepository.findByUserId(userId).orElseGet(() ->
                Streak.builder().user(user).build());

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        if (streak.getLastActivityDate() == null) {
            streak.setCurrentStreak(1);
            streak.setLastActivityDate(today);
            streak.setWeekStartDate(today);
            streak.setMonthStartDate(today);
        } else if (streak.getLastActivityDate().equals(today)) {
            // Already logged today, no change
            return toResponse(streak);
        } else if (streak.getLastActivityDate().equals(yesterday)) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
            streak.setLastActivityDate(today);
        } else {
            // Streak broken
            streak.setCurrentStreak(1);
            streak.setLastActivityDate(today);
        }

        if (streak.getCurrentStreak() > streak.getLongestStreak()) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }

        // Weekly streak (consecutive weeks with activity)
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1);
        if (streak.getWeekStartDate() == null || !streak.getWeekStartDate().equals(weekStart)) {
            if (streak.getWeekStartDate() != null) {
                streak.setWeeklyStreak(streak.getWeeklyStreak() + 1);
            }
            streak.setWeekStartDate(weekStart);
        }

        streakRepository.save(streak);
        checkAchievements(userId);
        return toResponse(streak);
    }

    @Transactional
    public void addXp(Long userId, int amount, String reason, String referenceType, Long referenceId) {
        User user = userRepository.findById(userId).orElseThrow();
        XpTransaction tx = XpTransaction.builder()
                .user(user).amount(amount).reason(reason)
                .referenceType(referenceType).referenceId(referenceId)
                .build();
        xpTransactionRepository.save(tx);

        UserXp userXp = userXpRepository.findByUserId(userId).orElseGet(() ->
                UserXp.builder().user(user).build());
        userXp.setTotalXp(userXp.getTotalXp() + amount);
        int newLevel = XpResponse.calculateLevel(userXp.getTotalXp());
        if (newLevel > userXp.getLevel()) {
            userXp.setLevel(newLevel);
        }
        userXpRepository.save(userXp);
    }

    public GamificationDashboardResponse getDashboard(Long userId) {
        Streak streak = streakRepository.findByUserId(userId).orElse(null);
        StreakResponse streakResp = streak != null ? toResponse(streak)
                : new StreakResponse(0, 0, 0, 0, 0, 0, null, false, "Start your learning journey!");

        UserXp userXp = userXpRepository.findByUserId(userId).orElseGet(() -> UserXp.builder().build());
        List<XpTransaction> recent = xpTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().limit(10).toList();
        int xpForNext = XpResponse.xpForLevel(userXp.getLevel());
        int progress = XpResponse.progressInLevel(userXp.getTotalXp(), userXp.getLevel());
        XpResponse xpResp = new XpResponse(
                userXp.getTotalXp(), userXp.getLevel(),
                xpForNext, progress,
                recent.stream().map(XpTransactionResponse::from).toList()
        );

        List<AchievementResponse> allAchievements = achievementRepository.findAll().stream()
                .map(a -> {
                    boolean earned = userBadgeRepository.existsByUserIdAndAchievementCode(userId, a.getCode());
                    Instant earnedAt = null;
                    if (earned) {
                        earnedAt = userBadgeRepository.findByUserIdAndAchievementCode(userId, a.getCode())
                                .map(ub -> ub.getEarnedAt()).orElse(null);
                    }
                    return new AchievementResponse(
                            a.getCode(), a.getTitle(), a.getDescription(),
                            a.getIcon(), a.getCategory(), a.getXpReward(),
                            earned, earnedAt
                    );
                })
                .sorted(Comparator.comparing(AchievementResponse::earned).reversed())
                .toList();

        long unread = allAchievements.stream().filter(a -> a.earned()).count();

        return new GamificationDashboardResponse(streakResp, xpResp, allAchievements, (int) unread);
    }

    @Transactional
    public void checkAchievements(Long userId) {
        List<Achievement> all = achievementRepository.findAll();
        List<UserBadge> earned = userBadgeRepository.findByUserId(userId);
        var earnedCodes = earned.stream().map(UserBadge::getAchievementCode).collect(Collectors.toSet());

        UserXp userXp = userXpRepository.findByUserId(userId).orElse(null);
        Streak streak = streakRepository.findByUserId(userId).orElse(null);
        int totalXp = userXp != null ? userXp.getTotalXp() : 0;
        int currentStreak = streak != null ? streak.getCurrentStreak() : 0;

        for (Achievement a : all) {
            if (earnedCodes.contains(a.getCode())) continue;
            boolean earnedNow = false;
            switch (a.getCode()) {
                case "WELCOME" -> earnedNow = totalXp > 0;
                case "STREAK_3" -> earnedNow = currentStreak >= 3;
                case "STREAK_7" -> earnedNow = currentStreak >= 7;
                case "STREAK_14" -> earnedNow = currentStreak >= 14;
                case "STREAK_30" -> earnedNow = currentStreak >= 30;
                case "STREAK_100" -> earnedNow = currentStreak >= 100;
                default -> {}
            }
            if (earnedNow) {
                UserBadge badge = UserBadge.builder()
                        .user(userXp.getUser())
                        .achievementCode(a.getCode())
                        .build();
                userBadgeRepository.save(badge);
                if (a.getXpReward() > 0) {
                    addXp(userId, a.getXpReward(), "Achievement: " + a.getTitle(), "ACHIEVEMENT", null);
                }
            }
        }
    }

    public int getLevel(Long userId) {
        return userXpRepository.findByUserId(userId)
                .map(UserXp::getLevel)
                .orElse(1);
    }

    private StreakResponse toResponse(Streak s) {
        if (s == null) return new StreakResponse(0, 0, 0, 0, 0, 0, null, false, "Start your learning journey!");
        boolean atRisk = s.getLastActivityDate() != null
                && s.getLastActivityDate().plusDays(1).isBefore(LocalDate.now());
        String msg;
        if (s.getCurrentStreak() == 0) msg = "Start your learning journey!";
        else if (atRisk) msg = "Your " + s.getCurrentStreak() + "-day streak is at risk!";
        else msg = s.getCurrentStreak() + "-day streak 🔥";
        return new StreakResponse(
                s.getCurrentStreak(), s.getLongestStreak(),
                s.getWeeklyStreak(), s.getMonthlyStreak(),
                s.getPerfectWeeks(), s.getPerfectMonths(),
                s.getLastActivityDate(), atRisk, msg
        );
    }
}

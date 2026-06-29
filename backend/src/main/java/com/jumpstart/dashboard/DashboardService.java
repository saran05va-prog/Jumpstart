package com.jumpstart.dashboard;

import com.jumpstart.certification.Certification;
import com.jumpstart.certification.CertificationRepository;
import com.jumpstart.certification.CertificationStatus;
import com.jumpstart.goal.Goal;
import com.jumpstart.goal.GoalRepository;
import com.jumpstart.project.Project;
import com.jumpstart.project.ProjectRepository;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.session.StudySession;
import com.jumpstart.session.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RoadmapRepository roadmapRepository;
    private final StudySessionRepository sessionRepository;
    private final GoalRepository goalRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long userId) {
        List<Roadmap> roadmaps = roadmapRepository.findByOwnerId(userId)
                .stream().filter(r -> !r.isArchived()).toList();

        int activeRoadmaps = roadmaps.size();

        int totalTopics = roadmaps.stream().mapToInt(r -> r.getTopics().size()).sum();
        int completedTopics = roadmaps.stream()
                .flatMap(r -> r.getTopics().stream())
                .mapToInt(t -> t.getStatus().isCompleted() ? 1 : 0).sum();

        List<StudySession> allSessions = sessionRepository.findByOwnerIdOrderBySessionDateDesc(userId);
        double totalStudyHours = allSessions.stream().mapToDouble(s -> s.getMinutes() / 60.0).sum();

        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        List<StudySession> weekSessions = allSessions.stream()
                .filter(s -> !s.getSessionDate().isBefore(weekStart) && !s.getSessionDate().isAfter(weekEnd))
                .toList();
        double weekStudyHours = weekSessions.stream().mapToDouble(s -> s.getMinutes() / 60.0).sum();

        int[] streaks = computeStreaks(allSessions);
        int currentStreak = streaks[0];
        int longestStreak = streaks[1];

        List<Goal> goals = goalRepository.findByOwnerId(userId);
        int goalsOnTrack = (int) goals.stream().filter(g -> g.getProgressValue() >= g.getTargetValue()).count();

        List<Certification> certs = certificationRepository.findByOwnerId(userId);
        int plannedCerts = (int) certs.stream().filter(c -> c.getStatus() == CertificationStatus.PLANNED).count();
        int inProgressCerts = (int) certs.stream().filter(c -> c.getStatus() == CertificationStatus.IN_PROGRESS).count();
        int completedCerts = (int) certs.stream().filter(c -> c.getStatus() == CertificationStatus.COMPLETED).count();

        List<Project> projects = projectRepository.findByOwnerIdOrderByCreatedAtDesc(userId);
        int totalProjects = projects.size();
        int completedProjects = (int) projects.stream().filter(Project::isCompleted).count();

        List<DashboardResponse.StudyDay> heatmap = buildHeatmap(allSessions);
        List<DashboardResponse.StudyDay> weeklyHours = buildWeeklyHours(weekSessions, weekStart);
        List<DashboardResponse.RoadmapProgress> roadmapProgress = roadmaps.stream()
                .map(r -> new DashboardResponse.RoadmapProgress(
                        r.getId(), r.getTitle(), computeProgress(r), r.getTopics().size(),
                        r.getColorTheme().name()))
                .toList();

        List<DashboardResponse.RecentActivity> recentActivity = buildRecentActivity(allSessions, projects, goals);

        return new DashboardResponse(
                activeRoadmaps, totalTopics, completedTopics,
                totalProjects, completedProjects,
                totalStudyHours, weekStudyHours,
                currentStreak, longestStreak,
                goalsOnTrack, goals.size(),
                plannedCerts, inProgressCerts, completedCerts,
                heatmap, weeklyHours, roadmapProgress, recentActivity
        );
    }

    private int computeProgress(Roadmap roadmap) {
        var topics = roadmap.getTopics();
        if (topics.isEmpty()) return 0;
        long done = topics.stream().filter(t -> t.getStatus().isCompleted()).count();
        return (int) Math.round((done * 100.0) / topics.size());
    }

    private int[] computeStreaks(List<StudySession> sessions) {
        if (sessions.isEmpty()) return new int[]{0, 0};

        Set<LocalDate> dates = new TreeSet<>(Collections.reverseOrder());
        for (StudySession s : sessions) dates.add(s.getSessionDate());

        LocalDate today = LocalDate.now();
        int current = 0;
        LocalDate cursor = today;
        if (!dates.contains(today)) cursor = today.minusDays(1);
        while (dates.contains(cursor)) {
            current++;
            cursor = cursor.minusDays(1);
        }

        int longest = 0;
        int chain = 0;
        LocalDate prev = null;
        for (LocalDate d : new TreeSet<>(dates)) {
            if (prev != null && d.equals(prev.plusDays(1))) {
                chain++;
            } else {
                chain = 1;
            }
            longest = Math.max(longest, chain);
            prev = d;
        }
        return new int[]{current, Math.max(longest, current)};
    }

    private List<DashboardResponse.StudyDay> buildHeatmap(List<StudySession> sessions) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(18 * 7 - 1);
        Map<LocalDate, Double> dayHours = new HashMap<>();
        Map<LocalDate, Integer> dayCount = new HashMap<>();
        for (StudySession s : sessions) {
            if (!s.getSessionDate().isBefore(start) && !s.getSessionDate().isAfter(end)) {
                dayHours.merge(s.getSessionDate(), s.getMinutes() / 60.0, Double::sum);
                dayCount.merge(s.getSessionDate(), 1, Integer::sum);
            }
        }
        List<DashboardResponse.StudyDay> result = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            result.add(new DashboardResponse.StudyDay(d, dayHours.getOrDefault(d, 0.0), dayCount.getOrDefault(d, 0)));
        }
        return result;
    }

    private List<DashboardResponse.StudyDay> buildWeeklyHours(List<StudySession> weekSessions, LocalDate weekStart) {
        String[] dayNames = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        double[] hours = new double[7];
        for (StudySession s : weekSessions) {
            int dayIdx = s.getSessionDate().getDayOfWeek().getValue() - 1;
            hours[dayIdx] += s.getMinutes() / 60.0;
        }
        List<DashboardResponse.StudyDay> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            result.add(new DashboardResponse.StudyDay(weekStart.plusDays(i), Math.round(hours[i] * 100) / 100.0, 0));
        }
        return result;
    }

    private List<DashboardResponse.RecentActivity> buildRecentActivity(
            List<StudySession> sessions, List<Project> projects, List<Goal> goals) {
        List<DashboardResponse.RecentActivity> activities = new ArrayList<>();

        sessions.stream().limit(5).forEach(s -> {
            String subtitle = String.format("%.1f hours on %s", s.getMinutes() / 60.0, s.getSessionDate());
            activities.add(new DashboardResponse.RecentActivity(
                    "SESSION", "Study session logged", subtitle, s.getSessionDate().toString()));
        });

        projects.stream().limit(3).forEach(p -> {
            activities.add(new DashboardResponse.RecentActivity(
                    "PROJECT", p.getTitle(), p.isCompleted() ? "Completed" : "In progress", p.getCreatedAt().toString()));
        });

        goals.stream().filter(g -> g.getProgressValue() >= g.getTargetValue()).limit(2).forEach(g -> {
            activities.add(new DashboardResponse.RecentActivity(
                    "GOAL", "Goal completed: " + g.getLabel(), g.getCadence().name(), g.getUpdatedAt().toString()));
        });

        return activities.stream().limit(8).toList();
    }
}

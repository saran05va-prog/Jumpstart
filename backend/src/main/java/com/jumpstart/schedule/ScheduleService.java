package com.jumpstart.schedule;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.schedule.dto.*;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.topic.TopicStatus;
import com.jumpstart.topic.prerequisite.TopicPrerequisiteRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import com.jumpstart.user.settings.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final StudyScheduleRepository scheduleRepository;
    private final TopicRepository topicRepository;
    private final RoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final UserSettingsRepository settingsRepository;
    private final TopicPrerequisiteRepository prerequisiteRepository;

    public List<ScheduleItemResponse> getWeek(Long userId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return scheduleRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, weekStart, weekEnd)
                .stream().map(ScheduleItemResponse::from).toList();
    }

    public List<ScheduleStatsResponse> getStats(Long userId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        List<StudySchedule> items = scheduleRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, weekStart, weekEnd);
        Map<LocalDate, List<StudySchedule>> byDate = items.stream().collect(Collectors.groupingBy(StudySchedule::getScheduledDate));
        List<ScheduleStatsResponse> stats = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            List<StudySchedule> dayItems = byDate.getOrDefault(date, List.of());
            int planned = dayItems.stream().mapToInt(StudySchedule::getPlannedMinutes).sum();
            stats.add(new ScheduleStatsResponse(date, planned, 0));
        }
        return stats;
    }

    @Transactional
    public ScheduleItemResponse create(ScheduleRequest request, Long userId, Role role) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Topic topic = loadTopic(request.topicId(), userId, role);
        StudySchedule s = StudySchedule.builder()
                .user(user).topic(topic)
                .scheduledDate(request.scheduledDate())
                .plannedMinutes(request.plannedMinutes() != null ? request.plannedMinutes() : 60)
                .note(request.note())
                .build();
        return ScheduleItemResponse.from(scheduleRepository.save(s));
    }

    @Transactional
    public ScheduleItemResponse update(Long id, ScheduleRequest request, Long userId, Role role) {
        StudySchedule s = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        if (!s.getUser().getId().equals(userId) && role != Role.ADMIN) {
            throw new ForbiddenException("Not your schedule item");
        }
        if (request.scheduledDate() != null) s.setScheduledDate(request.scheduledDate());
        if (request.plannedMinutes() != null) s.setPlannedMinutes(request.plannedMinutes());
        if (request.note() != null) s.setNote(request.note());
        return ScheduleItemResponse.from(scheduleRepository.save(s));
    }

    @Transactional
    public void delete(Long id, Long userId, Role role) {
        StudySchedule s = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        if (!s.getUser().getId().equals(userId) && role != Role.ADMIN) {
            throw new ForbiddenException("Not your schedule item");
        }
        scheduleRepository.delete(s);
    }

    public AutoSchedulePreview previewAuto(Long userId) {
        int dailyMinutes = settingsRepository.findByUserId(userId)
                .map(s -> s.getDailyStudyHours() * 60)
                .orElse(120);

        List<Roadmap> roadmaps = roadmapRepository.findByOwnerId(userId);
        List<Long> allTopicIds = roadmaps.stream()
                .flatMap(r -> topicRepository.findByRoadmapIdOrderBySortOrderAsc(r.getId()).stream())
                .map(Topic::getId)
                .toList();

        return generatePlan(userId, allTopicIds, LocalDate.now(), dailyMinutes, List.of(1, 2, 3, 4, 5));
    }

    public AutoSchedulePreview previewAutoPlan(Long userId, AutoPlanRequest request) {
        List<Long> topicIds = request.topicIds();
        if (topicIds == null || topicIds.isEmpty()) {
            List<Roadmap> roadmaps = roadmapRepository.findByOwnerId(userId);
            topicIds = roadmaps.stream()
                    .flatMap(r -> topicRepository.findByRoadmapIdOrderBySortOrderAsc(r.getId()).stream())
                    .map(Topic::getId)
                    .collect(Collectors.toList());
        }
        int dailyMinutes = request.dailyMinutes() != null ? request.dailyMinutes() : 120;
        List<Integer> studyDays = request.studyDays() != null ? request.studyDays() : List.of(1, 2, 3, 4, 5);
        LocalDate startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        return generatePlan(userId, topicIds, startDate, dailyMinutes, studyDays);
    }

    private AutoSchedulePreview generatePlan(Long userId, List<Long> topicIds, LocalDate startDate,
                                              int dailyMinutes, List<Integer> studyDays) {
        if (topicIds.isEmpty()) return new AutoSchedulePreview(0, 0, List.of());

        Set<Integer> studyDaySet = new HashSet<>(studyDays);
        List<Topic> allTopics = topicRepository.findAllById(topicIds).stream()
                .sorted(Comparator.comparingInt(Topic::getSortOrder))
                .toList();

        List<Topic> unscheduled = allTopics.stream()
                .filter(t -> t.getStatus() == TopicStatus.NOT_STARTED || t.getStatus() == TopicStatus.UPCOMING)
                .toList();

        if (unscheduled.isEmpty()) return new AutoSchedulePreview(0, 0, List.of());

        List<StudySchedule> existing = scheduleRepository.findByUserIdOrderByScheduledDateAsc(userId);
        Set<Long> scheduledTopicIds = existing.stream().map(s -> s.getTopic().getId()).collect(Collectors.toSet());
        Map<Long, LocalDate> topicDateMap = existing.stream()
                .collect(Collectors.toMap(s -> s.getTopic().getId(), StudySchedule::getScheduledDate, (a, b) -> a));

        Map<Long, List<Long>> prereqs = new HashMap<>();
        for (Topic t : allTopics) {
            prereqs.put(t.getId(), prerequisiteRepository.findByTopicId(t.getId())
                    .stream().map(p -> p.getPrerequisiteTopic().getId()).toList());
        }

        Map<Long, TopicStatus> statusMap = allTopics.stream()
                .collect(Collectors.toMap(Topic::getId, Topic::getStatus));

        List<Topic> toSchedule = unscheduled.stream()
                .filter(t -> !scheduledTopicIds.contains(t.getId()))
                .toList();

        List<ScheduleItemResponse> previewItems = new ArrayList<>();
        LocalDate cursor = startDate;
        int todayRemaining = dailyMinutes;

        for (Topic topic : toSchedule) {
            List<Long> prereqIds = prereqs.getOrDefault(topic.getId(), List.of());
            LocalDate prereqCutoff = cursor;
            boolean prereqsMet = prereqIds.stream().allMatch(pid -> {
                TopicStatus st = statusMap.get(pid);
                if (st == null) return true;
                if (st.isCompleted()) return true;
                LocalDate scheduled = topicDateMap.get(pid);
                return scheduled != null && !scheduled.isAfter(prereqCutoff);
            });
            if (!prereqsMet) continue;

            int topicMinutes = (int) Math.round(topic.getEstHours() * 60);
            int remaining = topicMinutes;

            while (remaining > 0) {
                int sessionMins = Math.min(remaining, todayRemaining);
                if (sessionMins <= 0) {
                    cursor = cursor.plusDays(1);
                    todayRemaining = dailyMinutes;
                    continue;
                }

                while (!studyDaySet.contains(cursor.getDayOfWeek().getValue() - 1)) {
                    cursor = cursor.plusDays(1);
                    todayRemaining = dailyMinutes;
                }

                LocalDate sessionDate = cursor;
                previewItems.add(ScheduleItemResponse.from(StudySchedule.builder()
                        .topic(topic)
                        .scheduledDate(sessionDate)
                        .plannedMinutes(sessionMins)
                        .build()));
                topicDateMap.put(topic.getId(), sessionDate);

                remaining -= sessionMins;
                todayRemaining -= sessionMins;

                if (remaining > 0) {
                    cursor = cursor.plusDays(1);
                    todayRemaining = dailyMinutes;
                }
            }
        }

        int totalDays = previewItems.isEmpty() ? 0 :
                (int) previewItems.stream().map(ScheduleItemResponse::scheduledDate).distinct().count();
        return new AutoSchedulePreview(previewItems.size(), totalDays, previewItems);
    }

    @Transactional
    public List<ScheduleItemResponse> confirmAuto(Long userId, Role role) {
        AutoSchedulePreview preview = previewAuto(userId);
        return persistPreview(userId, preview);
    }

    @Transactional
    public List<ScheduleItemResponse> confirmAutoPlan(Long userId, AutoPlanRequest request, Role role) {
        AutoSchedulePreview preview = previewAutoPlan(userId, request);
        return persistPreview(userId, preview);
    }

    private List<ScheduleItemResponse> persistPreview(Long userId, AutoSchedulePreview preview) {
        if (preview.items().isEmpty()) return List.of();
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        List<ScheduleItemResponse> created = new ArrayList<>();
        for (ScheduleItemResponse item : preview.items()) {
            Topic topic = topicRepository.findById(item.topicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic", item.topicId()));
            if (scheduleRepository.findByUserIdAndTopicIdAndScheduledDate(userId, item.topicId(), item.scheduledDate()).isEmpty()) {
                StudySchedule s = StudySchedule.builder()
                        .user(user).topic(topic)
                        .scheduledDate(item.scheduledDate())
                        .plannedMinutes(item.plannedMinutes())
                        .build();
                created.add(ScheduleItemResponse.from(scheduleRepository.save(s)));
            }
        }
        return created;
    }

    private Topic loadTopic(Long topicId, Long userId, Role role) {
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (role != Role.ADMIN && !topic.getRoadmap().getOwner().getId().equals(userId)) {
            throw new ForbiddenException("Not your topic");
        }
        return topic;
    }
}

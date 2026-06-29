package com.jumpstart.goal;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.goal.dto.GoalRequest;
import com.jumpstart.goal.dto.GoalResponse;
import com.jumpstart.schedule.StudyScheduleRepository;
import com.jumpstart.schedule.dto.ScheduleItemResponse;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.topic.timer.TopicTimerSessionRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final TopicTimerSessionRepository timerSessionRepository;
    private final StudyScheduleRepository scheduleRepository;

    @Transactional
    public GoalResponse create(GoalRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId).orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
        Topic topic = request.topicId() != null
                ? topicRepository.findById(request.topicId()).orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()))
                : null;

        Goal goal = Goal.builder()
                .owner(owner)
                .label(request.label())
                .description(request.description())
                .cadence(Cadence.valueOf(request.cadence()))
                .priority(request.priority() != null ? request.priority() : "medium")
                .status("active")
                .targetValue(request.targetValue())
                .progressValue(request.progressValue())
                .unit(request.unit())
                .dueDate(request.dueDate())
                .topic(topic)
                .build();

        return GoalResponse.from(goalRepository.save(goal));
    }

    public PageResponse<GoalResponse> list(Long ownerId, Cadence cadence, String status, Long topicId, Pageable pageable) {
        var page = goalRepository.findByOwnerId(ownerId, pageable);
        if (cadence != null) page = goalRepository.findByOwnerIdAndCadence(ownerId, cadence, pageable);
        else if (status != null) page = goalRepository.findByOwnerIdAndStatus(ownerId, status, pageable);
        else if (topicId != null) page = goalRepository.findByOwnerIdAndTopicId(ownerId, topicId, pageable);
        return PageResponse.from(page.map(GoalResponse::from));
    }

    @Transactional
    public GoalResponse update(Long id, GoalRequest request, Long requesterId, Role requesterRole) {
        Goal goal = loadOwned(id, requesterId, requesterRole);
        goal.setLabel(request.label());
        goal.setDescription(request.description());
        goal.setCadence(Cadence.valueOf(request.cadence()));
        if (request.priority() != null) goal.setPriority(request.priority());
        if (request.status() != null) {
            goal.setStatus(request.status());
            if ("completed".equals(request.status()) && goal.getCompletedAt() == null) {
                goal.setCompletedAt(Instant.now());
            }
        }
        goal.setTargetValue(request.targetValue());
        goal.setProgressValue(request.progressValue());
        goal.setUnit(request.unit());
        goal.setDueDate(request.dueDate());
        if (request.topicId() != null) {
            Topic topic = topicRepository.findById(request.topicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()));
            goal.setTopic(topic);
        }
        return GoalResponse.from(goalRepository.save(goal));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        goalRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    private Goal loadOwned(Long id, Long requesterId, Role requesterRole) {
        Goal goal = goalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Goal", id));
        if (requesterRole != Role.ADMIN && !goal.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this goal");
        }
        return goal;
    }

    public void checkAndCompleteGoalFromTimer(Long userId, Long topicId) {
        List<Goal> goals = goalRepository.findByOwnerIdAndTopicIdAndStatus(userId, topicId, "active");
        int totalSeconds = timerSessionRepository.findByTopicIdAndUserIdOrderByCreatedAtDesc(topicId, userId).stream()
                .mapToInt(s -> s.getDurationSeconds())
                .sum();
        for (Goal goal : goals) {
            double targetMinutes = goal.getTargetValue();
            if ("hours".equalsIgnoreCase(goal.getUnit())) targetMinutes *= 60;
            if (totalSeconds >= targetMinutes * 60 && !goal.getStatus().equals("completed")) {
                goal.setProgressValue(goal.getTargetValue());
                goal.setStatus("completed");
                goal.setCompletedAt(Instant.now());
                goalRepository.save(goal);
            }
        }
    }

    public List<ScheduleItemResponse> getTodaySchedule(Long userId) {
        return scheduleRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, LocalDate.now(), LocalDate.now())
                .stream().map(ScheduleItemResponse::from).toList();
    }

    @Transactional
    public GoalResponse createDailyFromSchedule(Long userId, Long topicId, String topicTitle, int plannedMinutes) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Topic topic = topicRepository.findById(topicId).orElse(null);
        Goal goal = Goal.builder()
                .owner(user)
                .label("Study: " + topicTitle)
                .cadence(Cadence.DAILY)
                .priority("medium")
                .status("active")
                .targetValue(plannedMinutes)
                .progressValue(0)
                .unit("minutes")
                .dueDate(LocalDate.now())
                .topic(topic)
                .build();
        return GoalResponse.from(goalRepository.save(goal));
    }
}

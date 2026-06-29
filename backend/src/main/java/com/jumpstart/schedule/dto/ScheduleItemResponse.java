package com.jumpstart.schedule.dto;

import com.jumpstart.schedule.StudySchedule;
import com.jumpstart.topic.Topic;

import java.time.LocalDate;

public record ScheduleItemResponse(
        Long id,
        Long topicId,
        String topicTitle,
        LocalDate scheduledDate,
        int plannedMinutes,
        String note
) {
    public static ScheduleItemResponse from(StudySchedule s) {
        return new ScheduleItemResponse(
                s.getId(),
                s.getTopic().getId(),
                s.getTopic().getTitle(),
                s.getScheduledDate(),
                s.getPlannedMinutes(),
                s.getNote()
        );
    }
}

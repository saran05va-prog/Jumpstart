package com.jumpstart.session.dto;

import com.jumpstart.session.StudySession;

import java.time.LocalDate;

public record StudySessionResponse(
        Long id,
        LocalDate sessionDate,
        double minutes,
        Long roadmapId,
        Long topicId,
        String note
) {
    public static StudySessionResponse from(StudySession s) {
        return new StudySessionResponse(
                s.getId(), s.getSessionDate(), s.getMinutes(),
                s.getRoadmapId(), s.getTopicId(), s.getNote()
        );
    }
}

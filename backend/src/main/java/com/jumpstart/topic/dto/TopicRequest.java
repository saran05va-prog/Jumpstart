package com.jumpstart.topic.dto;

import jakarta.validation.constraints.*;

public record TopicRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        @NotNull @Pattern(regexp = "NOT_STARTED|IN_PROGRESS|REVISION|COMPLETED|DONE|CURRENT|UPCOMING|LOCKED",
                message = "Invalid status")
        String status,
        @Min(1) @Max(3) int difficulty,
        @Positive double estHours,
        @Min(0) int sortOrder,
        @Size(max = 60) String milestoneLabel
) {
}

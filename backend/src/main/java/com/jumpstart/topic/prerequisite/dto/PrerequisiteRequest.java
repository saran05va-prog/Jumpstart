package com.jumpstart.topic.prerequisite.dto;

import jakarta.validation.constraints.NotNull;

public record PrerequisiteRequest(
        @NotNull Long prerequisiteTopicId
) {}

package com.jumpstart.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectRequest(
        @NotBlank @Size(max = 200) String title,
        String summary,
        @Size(max = 1000) String githubUrl,
        @Size(max = 1000) String demoUrl,
        boolean completed,
        Long topicId,
        Long roadmapId
) {
}

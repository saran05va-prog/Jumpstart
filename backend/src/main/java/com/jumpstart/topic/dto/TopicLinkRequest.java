package com.jumpstart.topic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TopicLinkRequest(
        @NotBlank @Size(max = 200) String label,
        @NotBlank @Size(max = 1000) String uri
) {
}

package com.jumpstart.resource.dto;

import jakarta.validation.constraints.*;

import java.util.List;

public record ResourceRequest(
        @NotBlank @Size(max = 240) String title,
        @NotBlank @Pattern(regexp = "ARTICLE|DOCUMENTATION|VIDEO|YOUTUBE|COURSE|BOOK|PDF|GITHUB|CUSTOM|DOC|REPO",
                message = "Invalid resource type") String type,
        @Size(max = 1000) String url,
        List<String> tags,
        @DecimalMin("0") @DecimalMax("5") double rating,
        boolean bookmarked,
        boolean completed,
        @Size(max = 30) String duration,
        Long roadmapId,
        Long topicId,
        String status,
        Boolean favorite,
        Boolean hidden,
        @Min(0) @Max(100) Integer progressPercent,
        Integer estimatedMinutes,
        Integer actualMinutes,
        Integer lastPage,
        Integer videoPositionSeconds,
        Double readingProgress
) {
}

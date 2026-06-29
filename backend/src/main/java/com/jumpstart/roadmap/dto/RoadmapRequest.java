package com.jumpstart.roadmap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RoadmapRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 4000) String description,
        @Size(max = 60) String tag,
        @Pattern(regexp = "MOSS|EMBER|GOLD", message = "Color theme must be MOSS, EMBER, or GOLD")
        String colorTheme
) {
}

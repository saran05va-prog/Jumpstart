package com.jumpstart.search.dto;

public record SearchResult(
        String type,   // ROADMAP | NOTE | RESOURCE
        Long id,
        String title,
        String subtitle
) {
}

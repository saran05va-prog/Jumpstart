package com.jumpstart.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable, API-friendly wrapper around Spring Data's {@link Page} so the
 * pagination contract doesn't leak Spring internals to clients.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }
}

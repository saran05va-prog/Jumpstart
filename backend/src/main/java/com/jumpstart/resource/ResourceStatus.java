package com.jumpstart.resource;

/**
 * Unified resource status state machine.
 *
 * <p>Replaces the legacy {@code completed} boolean as the single source of
 * truth for the quick-complete cycle. The boolean is kept in sync by
 * {@link ResourceService} for backward compatibility with older clients.
 */
public enum ResourceStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED;

    /**
     * Parses a status string received from the API, falling back to
     * {@link #NOT_STARTED} when the value is blank or unrecognised.
     */
    public static ResourceStatus fromString(String value) {
        if (value == null || value.isBlank()) return NOT_STARTED;
        try {
            return ResourceStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return NOT_STARTED;
        }
    }

    /** Returns the next status in the quick-complete cycle. */
    public ResourceStatus next() {
        return switch (this) {
            case NOT_STARTED -> IN_PROGRESS;
            case IN_PROGRESS -> COMPLETED;
            case COMPLETED -> NOT_STARTED;
        };
    }

    public boolean isCompleted() {
        return this == COMPLETED;
    }

    public boolean isInProgress() {
        return this == IN_PROGRESS;
    }
}

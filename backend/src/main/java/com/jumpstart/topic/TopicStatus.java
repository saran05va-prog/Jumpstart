package com.jumpstart.topic;

public enum TopicStatus {
    NOT_STARTED, IN_PROGRESS, REVISION, COMPLETED,
    DONE, CURRENT, UPCOMING, LOCKED;

    public boolean isCompleted() {
        return this == COMPLETED || this == DONE;
    }
}

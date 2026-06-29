package com.jumpstart.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {
    public ResourceNotFoundException(String entity, Object id) {
        super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", entity + " with id " + id + " was not found");
    }

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }
}

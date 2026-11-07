package com.synthvault.exception;

/** Thrown when an id does not exist (or belongs to another user) - HTTP 404. */
public class ResourceNotFoundException extends AppException {

    public ResourceNotFoundException(String message) {
        super(404, message);
    }
}

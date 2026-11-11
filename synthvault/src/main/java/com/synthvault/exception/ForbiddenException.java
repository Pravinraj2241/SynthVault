package com.synthvault.exception;

/** Thrown when a logged-in USER calls an ADMIN-only action - HTTP 403. */
public class ForbiddenException extends AppException {

    public ForbiddenException(String message) {
        super(403, message);
    }
}

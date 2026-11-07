package com.synthvault.exception;

/** Thrown when the session token is missing or invalid - HTTP 401. */
public class UnauthorizedException extends AppException {

    public UnauthorizedException(String message) {
        super(401, message);
    }
}

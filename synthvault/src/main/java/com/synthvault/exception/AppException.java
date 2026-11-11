package com.synthvault.exception;

/**
 * Base class for all expected (business) errors.
 *
 * This is OOP inheritance in action: every specific exception below extends
 * this class, and the GlobalExceptionHandler catches the BASE type once
 * (polymorphism) instead of writing one handler per exception.
 */
public class AppException extends RuntimeException {

    private final int status;                       // HTTP status code to return

    public AppException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}

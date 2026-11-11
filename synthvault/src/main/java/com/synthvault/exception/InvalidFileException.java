package com.synthvault.exception;

/** Thrown for bad uploads (wrong extension, too large, empty) - HTTP 400. */
public class InvalidFileException extends AppException {

    public InvalidFileException(String message) {
        super(400, message);
    }
}

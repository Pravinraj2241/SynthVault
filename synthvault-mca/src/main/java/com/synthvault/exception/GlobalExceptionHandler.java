package com.synthvault.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.synthvault.dto.ErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;

/**
 * One place that turns every error into the SAME JSON shape:
 * { "timestamp", "status", "message", "path" }
 *
 * This is basic Spring Boot MVC error handling (@RestControllerAdvice),
 * not an extra framework. Because every business exception extends
 * AppException, ONE handler method covers them all (polymorphism).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Handles all business exceptions (404, 400, 401, 403) via inheritance. */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleApp(AppException ex, HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                LocalDateTime.now().toString(),
                ex.getStatus(),
                ex.getMessage(),
                request.getRequestURI());
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    /** Spring throws this before our code when the file is bigger than 5 MB. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex,
                                                        HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                LocalDateTime.now().toString(), 400,
                "File is too large - maximum upload size is 5 MB",
                request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /** Any unexpected error becomes a clean 500 instead of a raw stack trace. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception ex, HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                LocalDateTime.now().toString(), 500,
                "Internal error: " + ex.getMessage(),
                request.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}

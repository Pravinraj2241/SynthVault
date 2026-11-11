package com.synthvault.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.synthvault.dto.AuthResponse;
import com.synthvault.dto.LoginRequest;
import com.synthvault.dto.RegisterRequest;
import com.synthvault.dto.UserResponse;
import com.synthvault.model.User;
import com.synthvault.service.AuthService;

/** Register / login / logout / profile - basic REST controller. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        authService.logout(token);
        return Map.of("message", "Logged out successfully");
    }

    @GetMapping("/me")
    public UserResponse me(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        User user = authService.requireUser(token);
        return authService.toUserResponse(user);
    }
}

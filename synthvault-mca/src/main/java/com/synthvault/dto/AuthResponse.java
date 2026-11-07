package com.synthvault.dto;

/** Response for POST /api/auth/login: the session token + the logged-in user. */
public class AuthResponse {

    private final String token;
    private final String tokenType;     // header name to use: "X-Auth-Token"
    private final UserResponse user;

    public AuthResponse(String token, String tokenType, UserResponse user) {
        this.token = token;
        this.tokenType = tokenType;
        this.user = user;
    }

    public String getToken() { return token; }
    public String getTokenType() { return tokenType; }
    public UserResponse getUser() { return user; }
}

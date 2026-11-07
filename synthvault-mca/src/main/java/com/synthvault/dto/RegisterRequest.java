package com.synthvault.dto;

/** Request body for POST /api/auth/register (validated manually in AuthService). */
public class RegisterRequest {

    private String fullName;
    private String email;
    private String password;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

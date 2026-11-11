package com.synthvault.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.synthvault.dao.SessionDao;
import com.synthvault.dao.UserDao;
import com.synthvault.dto.AuthResponse;
import com.synthvault.dto.LoginRequest;
import com.synthvault.dto.RegisterRequest;
import com.synthvault.dto.UserResponse;
import com.synthvault.exception.AppException;
import com.synthvault.exception.ForbiddenException;
import com.synthvault.exception.UnauthorizedException;
import com.synthvault.model.Role;
import com.synthvault.model.User;
import com.synthvault.util.PasswordUtil;

/**
 * Register / login / logout WITHOUT any security framework:
 * - passwords hashed with SHA-256 (core Java java.security)
 * - login creates a random UUID token stored in the sessions table
 * - every protected API sends that token in the "X-Auth-Token" header
 * - roles (USER/ADMIN) are checked with plain Java if-statements
 */
@Service
public class AuthService {

    private final UserDao userDao;
    private final SessionDao sessionDao;

    public AuthService(UserDao userDao, SessionDao sessionDao) {
        this.userDao = userDao;
        this.sessionDao = sessionDao;
    }

    public UserResponse register(RegisterRequest request) {
        if (request == null || isBlank(request.getFullName())
                || isBlank(request.getEmail()) || isBlank(request.getPassword())) {
            throw new AppException(400, "fullName, email and password are required");
        }
        if (!request.getEmail().contains("@") || !request.getEmail().contains(".")) {
            throw new AppException(400, "Please provide a valid email address");
        }
        if (request.getPassword().length() < 6) {
            throw new AppException(400, "Password must be at least 6 characters");
        }
        String email = request.getEmail().trim().toLowerCase();
        if (userDao.findByEmail(email).isPresent()) {
            throw new AppException(400, "Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPassword(PasswordUtil.hash(request.getPassword()));
        user.setRole(Role.USER);                            // everyone starts as USER
        userDao.insert(user);
        return toUserResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        if (request == null || isBlank(request.getEmail()) || isBlank(request.getPassword())) {
            throw new AppException(400, "email and password are required");
        }
        String email = request.getEmail().trim().toLowerCase();
        User user = userDao.findByEmail(email)
                .orElseThrow(() -> new AppException(401, "Invalid email or password"));
        if (!PasswordUtil.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(401, "Invalid email or password");
        }

        String token = UUID.randomUUID().toString();        // session token (core Java)
        sessionDao.insert(token, user.getId());
        return new AuthResponse(token, "X-Auth-Token", toUserResponse(user));
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Missing X-Auth-Token header");
        }
        sessionDao.deleteByToken(token);
    }

    /** Called by every protected endpoint: returns the logged-in user or throws 401. */
    public User requireUser(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Missing X-Auth-Token header - login first");
        }
        Long userId = sessionDao.findUserIdByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token - login again"));
        return userDao.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User account no longer exists"));
    }

    /** Role check for admin-only endpoints - plain Java if-statement. */
    public void requireAdmin(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new ForbiddenException("This action needs the ADMIN role");
        }
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getFullName(),
                user.getEmail(), user.getRole().name());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

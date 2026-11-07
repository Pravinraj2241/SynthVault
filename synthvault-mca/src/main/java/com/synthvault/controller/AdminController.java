package com.synthvault.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.synthvault.dao.UserDao;
import com.synthvault.dto.UserResponse;
import com.synthvault.model.User;
import com.synthvault.service.AuthService;

/** ADMIN-only endpoints - demonstrates simple role-based access. */
@RestController
public class AdminController {

    private final AuthService authService;
    private final UserDao userDao;

    public AdminController(AuthService authService, UserDao userDao) {
        this.authService = authService;
        this.userDao = userDao;
    }

    @GetMapping("/api/admin/users")
    public List<UserResponse> allUsers(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        User user = authService.requireUser(token);
        authService.requireAdmin(user);                     // 403 if not ADMIN
        List<UserResponse> out = new ArrayList<>();
        for (User u : userDao.findAll()) {
            out.add(authService.toUserResponse(u));
        }
        return out;
    }
}

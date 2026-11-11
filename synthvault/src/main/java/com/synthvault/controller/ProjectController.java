package com.synthvault.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.synthvault.dto.ProjectRequest;
import com.synthvault.dto.ProjectResponse;
import com.synthvault.model.User;
import com.synthvault.service.AuthService;
import com.synthvault.service.ProjectService;

/** Project workspace CRUD - every method first authenticates via session token. */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final AuthService authService;
    private final ProjectService projectService;

    public ProjectController(AuthService authService, ProjectService projectService) {
        this.authService = authService;
        this.projectService = projectService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                  @RequestBody ProjectRequest request) {
        User user = authService.requireUser(token);
        return projectService.create(user, request);
    }

    @GetMapping
    public List<ProjectResponse> myProjects(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        return projectService.listMine(authService.requireUser(token));
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                               @PathVariable("id") Long id) {
        return projectService.getOne(authService.requireUser(token), id);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                  @PathVariable("id") Long id,
                                  @RequestBody ProjectRequest request) {
        return projectService.update(authService.requireUser(token), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                       @PathVariable("id") Long id) {
        projectService.delete(authService.requireUser(token), id);
    }
}

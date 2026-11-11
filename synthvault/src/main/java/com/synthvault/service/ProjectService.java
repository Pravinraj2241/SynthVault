package com.synthvault.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.synthvault.dao.DatasetDao;
import com.synthvault.dao.ProjectDao;
import com.synthvault.dto.ProjectRequest;
import com.synthvault.dto.ProjectResponse;
import com.synthvault.exception.AppException;
import com.synthvault.exception.ResourceNotFoundException;
import com.synthvault.model.Project;
import com.synthvault.model.User;
import com.synthvault.model.Role;

/** Project workspace CRUD with ownership checks (plain Java). */
@Service
public class ProjectService {

    private final ProjectDao projectDao;
    private final DatasetDao datasetDao;

    public ProjectService(ProjectDao projectDao, DatasetDao datasetDao) {
        this.projectDao = projectDao;
        this.datasetDao = datasetDao;
    }

    public ProjectResponse create(User user, ProjectRequest request) {
        String name = validatedName(request);
        Project project = new Project();
        project.setName(name);
        project.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
        project.setUserId(user.getId());
        projectDao.insert(project);
        return toResponse(project, 0);
    }

    public List<ProjectResponse> listMine(User user) {
        List<ProjectResponse> out = new ArrayList<>();
        for (Project project : projectDao.findByUserId(user.getId())) {
            out.add(toResponse(project, datasetDao.findByProjectId(project.getId()).size()));
        }
        return out;
    }

    public ProjectResponse getOne(User user, Long projectId) {
        Project project = getOwned(projectId, user);
        return toResponse(project, datasetDao.findByProjectId(project.getId()).size());
    }

    public ProjectResponse update(User user, Long projectId, ProjectRequest request) {
        String name = validatedName(request);
        Project project = getOwned(projectId, user);
        project.setName(name);
        project.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
        projectDao.update(project);
        return toResponse(project, datasetDao.findByProjectId(project.getId()).size());
    }

    public void delete(User user, Long projectId) {
        projectDao.deleteById(getOwned(projectId, user).getId());
        // child rows (datasets, columns, reports, synthetic) are removed by
        // ON DELETE CASCADE foreign keys in MySQL
    }

    /**
     * Ownership rule: a USER may only touch their own projects; an ADMIN can
     * touch anything. Other users' data returns 404 (hidden, not forbidden).
     */
    public Project getOwned(Long projectId, User user) {
        Project project = projectDao.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
        boolean owner = project.getUserId().equals(user.getId());
        if (!owner && user.getRole() != Role.ADMIN) {
            throw new ResourceNotFoundException("Project not found: " + projectId);
        }
        return project;
    }

    private String validatedName(ProjectRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new AppException(400, "Project name is required");
        }
        String name = request.getName().trim();
        if (name.length() > 100) {
            throw new AppException(400, "Project name must be at most 100 characters");
        }
        return name;
    }

    private ProjectResponse toResponse(Project project, int datasetCount) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(),
                project.getCreatedAt().toString(), datasetCount);
    }
}

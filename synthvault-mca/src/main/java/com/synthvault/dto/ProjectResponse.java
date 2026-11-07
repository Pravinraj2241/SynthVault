package com.synthvault.dto;

/** Response for a project (with how many datasets it contains). */
public class ProjectResponse {

    private final Long id;
    private final String name;
    private final String description;
    private final String createdAt;
    private final int datasetCount;

    public ProjectResponse(Long id, String name, String description,
                           String createdAt, int datasetCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = createdAt;
        this.datasetCount = datasetCount;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getCreatedAt() { return createdAt; }
    public int getDatasetCount() { return datasetCount; }
}

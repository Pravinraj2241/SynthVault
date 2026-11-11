package com.synthvault.model;

import java.time.LocalDateTime;

/** One uploaded CSV file with its analysis summary (datasets table). */
public class Dataset {

    private Long id;
    private Long projectId;                         // FK -> projects.id
    private String originalName;                    // name chosen by the user
    private String fileName;                        // stored name: <uuid>.csv
    private String filePath;                        // full path on disk
    private int rowCount;
    private int columnCount;
    private DatasetStatus status = DatasetStatus.UPLOADED;
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public int getRowCount() { return rowCount; }
    public void setRowCount(int rowCount) { this.rowCount = rowCount; }
    public int getColumnCount() { return columnCount; }
    public void setColumnCount(int columnCount) { this.columnCount = columnCount; }
    public DatasetStatus getStatus() { return status; }
    public void setStatus(DatasetStatus status) { this.status = status; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}

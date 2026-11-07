package com.synthvault.model;

import java.time.LocalDateTime;

/** Result of one synthetic generation run (synthetic_datasets table). */
public class SyntheticDataset {

    private Long id;
    private Long datasetId;                         // FK -> datasets.id (unique = 1:1)
    private String filePath;
    private int rowCount;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDatasetId() { return datasetId; }
    public void setDatasetId(Long datasetId) { this.datasetId = datasetId; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public int getRowCount() { return rowCount; }
    public void setRowCount(int rowCount) { this.rowCount = rowCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

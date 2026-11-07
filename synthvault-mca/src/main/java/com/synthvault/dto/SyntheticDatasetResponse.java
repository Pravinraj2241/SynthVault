package com.synthvault.dto;

/** Response for POST /api/datasets/{id}/generate. */
public class SyntheticDatasetResponse {

    private final Long id;
    private final Long datasetId;
    private final int rowCount;
    private final String downloadUrl;
    private final String createdAt;

    public SyntheticDatasetResponse(Long id, Long datasetId, int rowCount,
                                    String downloadUrl, String createdAt) {
        this.id = id;
        this.datasetId = datasetId;
        this.rowCount = rowCount;
        this.downloadUrl = downloadUrl;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Long getDatasetId() { return datasetId; }
    public int getRowCount() { return rowCount; }
    public String getDownloadUrl() { return downloadUrl; }
    public String getCreatedAt() { return createdAt; }
}

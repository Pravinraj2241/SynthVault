package com.synthvault.dto;

/** Short dataset info used in "list datasets of a project" responses. */
public class DatasetSummaryResponse {

    private final Long id;
    private final String originalName;
    private final int rowCount;
    private final int columnCount;
    private final String status;
    private final String uploadedAt;

    public DatasetSummaryResponse(Long id, String originalName, int rowCount,
                                  int columnCount, String status, String uploadedAt) {
        this.id = id;
        this.originalName = originalName;
        this.rowCount = rowCount;
        this.columnCount = columnCount;
        this.status = status;
        this.uploadedAt = uploadedAt;
    }

    public Long getId() { return id; }
    public String getOriginalName() { return originalName; }
    public int getRowCount() { return rowCount; }
    public int getColumnCount() { return columnCount; }
    public String getStatus() { return status; }
    public String getUploadedAt() { return uploadedAt; }
}

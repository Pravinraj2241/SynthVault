package com.synthvault.dto;

import java.util.List;

/** Full analysis of one dataset: schema + PII + privacy report + 5-row preview. */
public class DatasetAnalysisResponse {

    private final Long id;
    private final Long projectId;
    private final String originalName;
    private final int rowCount;
    private final int columnCount;
    private final String status;
    private final List<ColumnAnalysisResponse> columns;
    private final PrivacyReportResponse privacyReport;
    private final List<List<String>> preview;   // first 5 rows of the uploaded file

    public DatasetAnalysisResponse(Long id, Long projectId, String originalName,
                                   int rowCount, int columnCount, String status,
                                   List<ColumnAnalysisResponse> columns,
                                   PrivacyReportResponse privacyReport,
                                   List<List<String>> preview) {
        this.id = id;
        this.projectId = projectId;
        this.originalName = originalName;
        this.rowCount = rowCount;
        this.columnCount = columnCount;
        this.status = status;
        this.columns = columns;
        this.privacyReport = privacyReport;
        this.preview = preview;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public String getOriginalName() { return originalName; }
    public int getRowCount() { return rowCount; }
    public int getColumnCount() { return columnCount; }
    public String getStatus() { return status; }
    public List<ColumnAnalysisResponse> getColumns() { return columns; }
    public PrivacyReportResponse getPrivacyReport() { return privacyReport; }
    public List<List<String>> getPreview() { return preview; }
}

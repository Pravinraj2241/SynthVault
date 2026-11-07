package com.synthvault.dto;

/** Request body for POST /api/datasets/{id}/generate. */
public class GenerationRequest {

    private Integer rowCount;

    public Integer getRowCount() { return rowCount; }
    public void setRowCount(Integer rowCount) { this.rowCount = rowCount; }
}

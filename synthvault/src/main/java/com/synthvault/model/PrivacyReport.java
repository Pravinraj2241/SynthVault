package com.synthvault.model;

import java.time.LocalDateTime;

/** Weighted privacy risk score for a dataset (privacy_reports table). */
public class PrivacyReport {

    private Long id;
    private Long datasetId;                         // FK -> datasets.id (unique = 1:1)
    private int riskScore;                          // 0..100
    private RiskLevel riskLevel;
    private int piiColumnCount;
    private String details;                         // human-readable findings
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDatasetId() { return datasetId; }
    public void setDatasetId(Long datasetId) { this.datasetId = datasetId; }
    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }
    public int getPiiColumnCount() { return piiColumnCount; }
    public void setPiiColumnCount(int piiColumnCount) { this.piiColumnCount = piiColumnCount; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

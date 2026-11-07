package com.synthvault.dto;

/** The weighted privacy score of a dataset. */
public class PrivacyReportResponse {

    private final int riskScore;        // 0..100
    private final String riskLevel;     // LOW / MEDIUM / HIGH / CRITICAL
    private final int piiColumnCount;
    private final String details;

    public PrivacyReportResponse(int riskScore, String riskLevel,
                                 int piiColumnCount, String details) {
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.piiColumnCount = piiColumnCount;
        this.details = details;
    }

    public int getRiskScore() { return riskScore; }
    public String getRiskLevel() { return riskLevel; }
    public int getPiiColumnCount() { return piiColumnCount; }
    public String getDetails() { return details; }
}

package com.synthvault.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.synthvault.model.DatasetColumn;
import com.synthvault.model.PiiType;
import com.synthvault.model.PrivacyReport;
import com.synthvault.model.RiskLevel;

/**
 * Weighted privacy risk score - a fully explainable formula:
 *
 *   score = SUM of weights of every detected PII column (capped at 100)
 *   levels: <=25 LOW, <=45 MEDIUM, <=80 HIGH, >80 CRITICAL
 *
 * Every score can be traced back to named columns, which is exactly what a
 * privacy tool needs (better than an opaque model).
 */
@Service
public class PrivacyScoringService {

    /** Harm weight per PII type (Aadhaar & card = highest harm). */
    private static final Map<PiiType, Integer> WEIGHTS = Map.of(
            PiiType.EMAIL, 15,
            PiiType.PHONE, 15,
            PiiType.PAN, 20,
            PiiType.AADHAAR, 25,
            PiiType.CREDIT_CARD, 25);

    public PrivacyReport buildReport(List<DatasetColumn> columns) {
        int score = 0;
        int piiCount = 0;
        StringBuilder details = new StringBuilder();

        for (DatasetColumn col : columns) {
            if (col.getPiiType() != PiiType.NONE) {
                int weight = WEIGHTS.get(col.getPiiType());
                score += weight;
                piiCount++;
                details.append(col.getColumnName())
                       .append(" -> ").append(col.getPiiType())
                       .append(" (+" + weight + "); ");
            }
        }
        score = Math.min(score, 100);                       // normalize to 0..100

        PrivacyReport report = new PrivacyReport();
        report.setRiskScore(score);
        report.setRiskLevel(toLevel(score));
        report.setPiiColumnCount(piiCount);
        report.setDetails(piiCount == 0
                ? "No PII detected - dataset is safe to share"
                : "Detected PII: " + details);
        return report;
    }

    private RiskLevel toLevel(int score) {
        if (score <= 25) {
            return RiskLevel.LOW;                           // nothing or one strong identifier
        }
        if (score <= 45) {
            return RiskLevel.MEDIUM;                        // contact info + one strong identifier
        }
        if (score <= 80) {
            return RiskLevel.HIGH;                          // multiple strong identifiers
        }
        return RiskLevel.CRITICAL;                          // almost every column is sensitive
    }
}

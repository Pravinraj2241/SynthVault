package com.synthvault.dto;

/** Analysis result for ONE column: its detected type, PII type and stats. */
public class ColumnAnalysisResponse {

    private final String name;
    private final String type;          // INTEGER / DECIMAL / BOOLEAN / DATE / STRING
    private final String piiType;       // NONE / EMAIL / PHONE / AADHAAR / PAN / CREDIT_CARD
    private final Integer distinctCount;
    private final String minValue;
    private final String maxValue;

    public ColumnAnalysisResponse(String name, String type, String piiType,
                                  Integer distinctCount, String minValue, String maxValue) {
        this.name = name;
        this.type = type;
        this.piiType = piiType;
        this.distinctCount = distinctCount;
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    public String getName() { return name; }
    public String getType() { return type; }
    public String getPiiType() { return piiType; }
    public Integer getDistinctCount() { return distinctCount; }
    public String getMinValue() { return minValue; }
    public String getMaxValue() { return maxValue; }
}

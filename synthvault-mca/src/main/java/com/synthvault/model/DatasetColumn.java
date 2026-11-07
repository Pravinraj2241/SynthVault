package com.synthvault.model;

/** Analysis result for ONE column of a dataset (dataset_columns table). */
public class DatasetColumn {

    private Long id;
    private Long datasetId;                         // FK -> datasets.id
    private String columnName;
    private ColumnType columnType;
    private PiiType piiType = PiiType.NONE;
    private Integer distinctCount;                  // unique values (for STRING columns)
    private String minValue;                        // observed minimum (numeric/date)
    private String maxValue;                        // observed maximum (numeric/date)

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDatasetId() { return datasetId; }
    public void setDatasetId(Long datasetId) { this.datasetId = datasetId; }
    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }
    public ColumnType getColumnType() { return columnType; }
    public void setColumnType(ColumnType columnType) { this.columnType = columnType; }
    public PiiType getPiiType() { return piiType; }
    public void setPiiType(PiiType piiType) { this.piiType = piiType; }
    public Integer getDistinctCount() { return distinctCount; }
    public void setDistinctCount(Integer distinctCount) { this.distinctCount = distinctCount; }
    public String getMinValue() { return minValue; }
    public void setMinValue(String minValue) { this.minValue = minValue; }
    public String getMaxValue() { return maxValue; }
    public void setMaxValue(String maxValue) { this.maxValue = maxValue; }
}

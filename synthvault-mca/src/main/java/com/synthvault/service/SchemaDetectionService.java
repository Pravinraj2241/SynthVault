package com.synthvault.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.stereotype.Service;

import com.synthvault.model.ColumnType;

/**
 * Detects each column's data type by scanning its values with flag variables -
 * a classic one-pass inference algorithm (O(rows) per column).
 */
@Service
public class SchemaDetectionService {

    /** Reused by SyntheticGenerationService to parse stored date ranges. */
    public static final DateTimeFormatter[] DATE_FORMATS = {
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("MM/dd/yyyy")
    };

    /** Returns the detected type of one column based on ALL its values. */
    public ColumnType detectType(List<String> values) {
        if (values.isEmpty()) {
            return ColumnType.STRING;
        }
        boolean allInteger = true;
        boolean allDecimal = true;
        boolean allBoolean = true;
        boolean allDate = true;

        for (String value : values) {
            if (allInteger && !value.matches("-?\\d+")) {
                allInteger = false;
            }
            if (allDecimal && !value.matches("-?\\d*\\.\\d+")) {
                allDecimal = false;
            }
            if (allBoolean && !value.equalsIgnoreCase("true")
                    && !value.equalsIgnoreCase("false")
                    && !value.equals("0") && !value.equals("1")) {
                allBoolean = false;
            }
            if (allDate && !isDate(value)) {
                allDate = false;
            }
            if (!allInteger && !allDecimal && !allBoolean && !allDate) {
                break;                                      // early exit - already STRING
            }
        }

        if (allBoolean) {
            return ColumnType.BOOLEAN;
        }
        if (allDate) {
            return ColumnType.DATE;
        }
        if (allInteger) {
            return ColumnType.INTEGER;
        }
        if (allDecimal) {
            return ColumnType.DECIMAL;
        }
        return ColumnType.STRING;
    }

    /**
     * Returns {min, max} as strings for numeric/date columns, or null for
     * STRING/BOOLEAN. Used later by the synthetic generator to keep ranges.
     */
    public String[] computeRange(ColumnType type, List<String> values) {
        if (type == ColumnType.INTEGER) {
            Long min = null;
            Long max = null;
            for (String value : values) {
                Long parsed = parseLongSafe(value);
                if (parsed != null) {
                    if (min == null || parsed < min) {
                        min = parsed;
                    }
                    if (max == null || parsed > max) {
                        max = parsed;
                    }
                }
            }
            return min == null ? null : new String[] { String.valueOf(min), String.valueOf(max) };
        }
        if (type == ColumnType.DECIMAL) {
            Double min = null;
            Double max = null;
            for (String value : values) {
                Double parsed = parseDoubleSafe(value);
                if (parsed != null) {
                    if (min == null || parsed < min) {
                        min = parsed;
                    }
                    if (max == null || parsed > max) {
                        max = parsed;
                    }
                }
            }
            return min == null ? null : new String[] { String.valueOf(min), String.valueOf(max) };
        }
        if (type == ColumnType.DATE) {
            String min = null;
            String max = null;
            for (String value : values) {
                if (min == null || value.compareTo(min) < 0) {
                    min = value;
                }
                if (max == null || value.compareTo(max) > 0) {
                    max = value;
                }
            }
            return min == null ? null : new String[] { min, max };
        }
        return null;
    }

    private boolean isDate(String value) {
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                LocalDate.parse(value, format);
                return true;
            } catch (DateTimeParseException ignored) {
                // try the next format
            }
        }
        return false;
    }

    private Long parseLongSafe(String value) {
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Double parseDoubleSafe(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

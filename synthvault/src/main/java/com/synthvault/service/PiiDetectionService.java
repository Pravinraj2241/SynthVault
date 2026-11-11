package com.synthvault.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.synthvault.model.PiiType;

/**
 * Flags each column as PII using TWO signals:
 * 1) the column NAME (e.g. "email", "aadhaar", "card_number")
 * 2) the VALUES (regex patterns, with a 60% hit-rate threshold)
 *
 * VALUE_PATTERNS is a LinkedHashMap because iteration order = priority:
 * the first matching type wins (credit card before Aadhaar, etc.).
 */
@Service
public class PiiDetectionService {

    private static final Map<PiiType, Pattern> VALUE_PATTERNS = new LinkedHashMap<>();

    static {
        VALUE_PATTERNS.put(PiiType.EMAIL, Pattern.compile(
                "^[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}$"));
        VALUE_PATTERNS.put(PiiType.CREDIT_CARD, Pattern.compile(
                "^\\d{4}[ -]?\\d{4}[ -]?\\d{4}[ -]?\\d{1,7}$"));
        VALUE_PATTERNS.put(PiiType.AADHAAR, Pattern.compile(
                "^\\d{4}[ -]?\\d{4}[ -]?\\d{4}$"));
        VALUE_PATTERNS.put(PiiType.PAN, Pattern.compile(
                "^[A-Z]{5}\\d{4}[A-Z]$"));
        VALUE_PATTERNS.put(PiiType.PHONE, Pattern.compile(
                "^(\\+91[ -]?)?[6-9]\\d{9}$"));
    }

    /** Column-name hints (normalized: lowercase, _ and - removed). */
    private static final Map<PiiType, List<String>> NAME_HINTS = Map.of(
            PiiType.EMAIL, List.of("email", "mail", "emailid"),
            PiiType.PHONE, List.of("phone", "mobile", "contact", "phonenumber", "mobileno"),
            PiiType.AADHAAR, List.of("aadhaar", "aadhar", "uid", "uidai", "aadhaarnumber"),
            PiiType.PAN, List.of("pan", "pannumber", "panno", "pancard"),
            PiiType.CREDIT_CARD, List.of("card", "creditcard", "cardnumber", "ccnumber", "debitcard"));

    /** Classifies one column. Name hints are checked first, then value regexes. */
    public PiiType detectPii(String columnName, List<String> values) {
        String name = normalize(columnName);
        for (Map.Entry<PiiType, List<String>> entry : NAME_HINTS.entrySet()) {
            if (entry.getValue().contains(name)) {
                return entry.getKey();
            }
        }

        int sampleSize = Math.min(values.size(), 100);      // sample at most 100 values
        if (sampleSize == 0) {
            return PiiType.NONE;
        }
        for (Map.Entry<PiiType, Pattern> entry : VALUE_PATTERNS.entrySet()) {
            int hits = 0;
            for (int i = 0; i < sampleSize; i++) {
                if (entry.getValue().matcher(values.get(i).trim()).matches()) {
                    hits++;
                }
            }
            if (hits * 100 / sampleSize >= 60) {
                return entry.getKey();
            }
        }
        return PiiType.NONE;
    }

    private String normalize(String columnName) {
        return columnName.toLowerCase()
                .replace("_", "")
                .replace("-", "")
                .replace(" ", "");
    }
}

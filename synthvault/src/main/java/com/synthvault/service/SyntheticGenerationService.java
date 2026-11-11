package com.synthvault.service;

import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.synthvault.dao.ColumnDao;
import com.synthvault.dao.SyntheticDao;
import com.synthvault.dto.GenerationRequest;
import com.synthvault.dto.SyntheticDatasetResponse;
import com.synthvault.exception.AppException;
import com.synthvault.model.ColumnType;
import com.synthvault.model.Dataset;
import com.synthvault.model.DatasetColumn;
import com.synthvault.model.PiiType;
import com.synthvault.model.SyntheticDataset;
import com.synthvault.model.User;
import com.synthvault.service.CsvParserService.CsvTable;

/**
 * The synthetic generation engine.
 *
 * Privacy rules (how the data stays BOTH safe and useful):
 * 1) PII columns   -> 100% fabricated, format-valid fake values (no linkage)
 * 2) numeric/date  -> random within the ORIGINAL min..max (stats still work)
 * 3) low-cardinality strings -> proportional pools mirroring the ORIGINAL
 *    per-key frequencies (scaled to the requested row count, min-1 floor,
 *    largest-remainder normalized, then shuffled)
 * 4) person-name columns  -> always fabricated; names are quasi-identifiers,
 *    so a real name from the original file never appears in the output
 */
@Service
public class SyntheticGenerationService {

    private static final int MAX_ROWS = 100000;
    private static final int MAX_CATEGORY_CARDINALITY = 20;
    private static final int DEFAULT_CATEGORY_SAMPLES = 1;
    private static final String[] FIRST_NAMES = {
        "Aarav", "Diya", "Ishaan", "Meera", "Rohan", "Sara", "Vikram", "Anaya"
    };
    private static final String[] LAST_NAMES = {
        "Sharma", "Verma", "Iyer", "Nair", "Patel", "Rao", "Gupta", "Menon"
    };
    private static final String[] WORDS = {
        "alpha", "bravo", "delta", "orbit", "pixel", "solar", "nova", "quartz"
    };

    /** Person-name column names (normalized: lowercase, _ - and space removed). */
    private static final List<String> NAME_HINTS = List.of(
            "name", "fullname", "firstname", "lastname", "middlename",
            "customername", "employeename", "studentname", "personname",
            "contactname", "username", "authorname");

    private final SecureRandom random = new SecureRandom();

    private final DatasetService datasetService;
    private final ColumnDao columnDao;
    private final SyntheticDao syntheticDao;
    private final CsvFileService csvFileService;
    private final CsvParserService csvParserService;

    public SyntheticGenerationService(DatasetService datasetService,
                                      ColumnDao columnDao,
                                      SyntheticDao syntheticDao,
                                      CsvFileService csvFileService,
                                      CsvParserService csvParserService) {
        this.datasetService = datasetService;
        this.columnDao = columnDao;
        this.syntheticDao = syntheticDao;
        this.csvFileService = csvFileService;
        this.csvParserService = csvParserService;
    }

    public SyntheticDatasetResponse generate(User user, Long datasetId, GenerationRequest request) {
        Dataset dataset = datasetService.getOwned(datasetId, user);
        validateRequest(request);
        int count = request.getRowCount();

        List<DatasetColumn> columns = columnDao.findByDatasetId(datasetId);
        CsvTable table = csvParserService.parse(Path.of(dataset.getFilePath()));

        // caches built from the ORIGINAL file
        Map<String, Map<String, Integer>> categories = new HashMap<>();
        Map<String, long[]> intRanges = new HashMap<>();
        Map<String, double[]> decRanges = new HashMap<>();
        Map<String, LocalDate[]> dateRanges = new HashMap<>();
        loadOriginals(columns, table.getRows(), categories, intRanges, decRanges, dateRanges);
        Map<String, List<String>> stringPools = buildCategoryPools(columns, categories, count);

        // build "count" fake rows, one column at a time
        List<String[]> rows = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            String[] row = new String[columns.size()];
            for (int c = 0; c < columns.size(); c++) {
                row[c] = syntheticValue(columns.get(c), categories, intRanges, decRanges, dateRanges, stringPools, i);
            }
            rows.add(row);
        }

        String header = buildHeader(columns);
        Path file = csvFileService.saveSyntheticCsv(header, rows);

        SyntheticDataset out = new SyntheticDataset();
        out.setDatasetId(datasetId);
        out.setFilePath(file.toString());
        out.setRowCount(count);
        syntheticDao.insert(out);

        return new SyntheticDatasetResponse(
                out.getId(), datasetId, count,
                "/api/datasets/" + datasetId + "/synthetic/download",
                out.getCreatedAt().toString());
    }

    // ------------------------------------------------------------------ private

    private void validateRequest(GenerationRequest request) {
        if (request == null || request.getRowCount() == null) {
            throw new AppException(400, "rowCount is required (e.g. 1000)");
        }
        if (request.getRowCount() < 1 || request.getRowCount() > MAX_ROWS) {
            throw new AppException(400, "rowCount must be between 1 and " + MAX_ROWS);
        }
    }

    /** Reads the original file and caches categories + numeric/date ranges. */
    private void loadOriginals(List<DatasetColumn> columns, List<Map<String, String>> rows,
                               Map<String, Map<String, Integer>> categories,
                               Map<String, long[]> intRanges,
                               Map<String, double[]> decRanges,
                               Map<String, LocalDate[]> dateRanges) {
        for (DatasetColumn col : columns) {
            List<String> values = extractColumn(rows, col.getColumnName());
            ColumnType type = col.getColumnType();
            if (type == ColumnType.INTEGER) {
                long min = parseLongSafe(col.getMinValue(), 0L);
                long max = parseLongSafe(col.getMaxValue(), 100L);
                if (min > max) {
                    long swap = min;
                    min = max;
                    max = swap;
                }
                intRanges.put(col.getColumnName(), new long[] { min, max });
            } else if (type == ColumnType.DECIMAL) {
                double min = parseDoubleSafe(col.getMinValue(), 0.0);
                double max = parseDoubleSafe(col.getMaxValue(), 100.0);
                if (min > max) {
                    double swap = min;
                    min = max;
                    max = swap;
                }
                decRanges.put(col.getColumnName(), new double[] { min, max });
            } else if (type == ColumnType.DATE) {
                dateRanges.put(col.getColumnName(), dateRange(values));
            } else if (type == ColumnType.STRING) {
                Map<String, Integer> freq = new LinkedHashMap<>();
                for (String value : values) {
                    freq.put(value, freq.getOrDefault(value, 0) + 1);
                }
                categories.put(col.getColumnName(), freq);
            }
            // BOOLEAN needs no cache - random true/false is enough
        }
    }

    /** Core dispatch: PII type first (fabricate), then column type. */
    private String syntheticValue(DatasetColumn col,
                                  Map<String, Map<String, Integer>> categories,
                                  Map<String, long[]> intRanges,
                                  Map<String, double[]> decRanges,
                                  Map<String, LocalDate[]> dateRanges,
                                  Map<String, List<String>> stringPools,
                                  int rowIndex) {
        PiiType pii = col.getPiiType();
        if (pii == PiiType.EMAIL) {
            return "user" + random.nextInt(100000) + "@example.com";
        }
        if (pii == PiiType.PHONE) {
            return "9" + randomDigits(9);                   // valid-looking 10-digit
        }
        if (pii == PiiType.AADHAAR) {
            return randomDigits(4) + " " + randomDigits(4) + " " + randomDigits(4);
        }
        if (pii == PiiType.PAN) {
            return randomLetters(5) + randomDigits(4) + randomLetter();
        }
        if (pii == PiiType.CREDIT_CARD) {
            return randomDigits(4) + "-" + randomDigits(4) + "-"
                    + randomDigits(4) + "-" + randomDigits(4);
        }

        String name = col.getColumnName();
        ColumnType type = col.getColumnType();
        if (type == ColumnType.INTEGER) {
            long[] range = intRanges.get(name);
            return String.valueOf(range[0] + random.nextLong(range[1] - range[0] + 1));
        }
        if (type == ColumnType.DECIMAL) {
            double[] range = decRanges.get(name);
            return String.format(Locale.ROOT, "%.2f",
                    range[0] + random.nextDouble() * (range[1] - range[0]));
        }
        if (type == ColumnType.DATE) {
            LocalDate[] range = dateRanges.get(name);
            return randomBetween(range[0], range[1]).toString();
        }
        if (type == ColumnType.BOOLEAN) {
            return String.valueOf(random.nextBoolean());
        }
        // STRING: person-name columns are quasi-identifiers -> always fabricated
        if (isNameColumn(name)) {
            return FIRST_NAMES[random.nextInt(FIRST_NAMES.length)] + " "
                    + LAST_NAMES[random.nextInt(LAST_NAMES.length)];
        }
        // STRING: keep original categories when cardinality is low
        Map<String, Integer> freq = categories.get(name);
        if (freq != null && !freq.isEmpty() && freq.size() <= MAX_CATEGORY_CARDINALITY) {
            List<String> pool = stringPools.get(name);
            if (pool != null && rowIndex >= 0 && rowIndex < pool.size()) {
                return pool.get(rowIndex);
            }
            List<String> distinct = new ArrayList<>(freq.keySet());
            return distinct.get(random.nextInt(distinct.size()));
        }
        return WORDS[random.nextInt(WORDS.length)] + random.nextInt(100);
    }

    /**
     * Builds one pre-shuffled value pool per eligible STRING column so the
     * generated rows mirror the RAW column proportions instead of a uniform
     * pick. Pool key = column name; each key's quota is scaled to the
     * requested row count (see perKeySamples), normalized to exactly
     * {@code rowCount} entries, then shuffled with SecureRandom.
     */
    private Map<String, List<String>> buildCategoryPools(List<DatasetColumn> columns,
                                                         Map<String, Map<String, Integer>> categories,
                                                         int rowCount) {
        Map<String, List<String>> pools = new HashMap<>();
        for (DatasetColumn col : columns) {
            String name = col.getColumnName();
            if (col.getColumnType() != ColumnType.STRING
                    || col.getPiiType() != PiiType.NONE
                    || isNameColumn(name)) {
                continue;                                   // fabricated or non-string: no pool
            }
            Map<String, Integer> freq = categories.get(name);
            if (freq == null || freq.isEmpty() || freq.size() > MAX_CATEGORY_CARDINALITY) {
                continue;                                   // high-cardinality: generic fallback words
            }
            Map<String, Integer> quotas = perKeySamples(freq, rowCount);
            List<String> pool = new ArrayList<>(rowCount);
            for (Map.Entry<String, Integer> entry : quotas.entrySet()) {
                for (int k = 0; k < entry.getValue(); k++) {
                    pool.add(entry.getKey());
                }
            }
            Collections.shuffle(pool, random);
            pools.put(name, pool);
        }
        return pools;
    }

    /**
     * Scales each distinct key's raw frequency to the requested row count:
     * quota = max(default floor, round(freq / total * rowCount)), then the
     * largest-remainder method trims or tops up quotas so they sum to exactly
     * {@code rowCount}. Falls back to a default of
     * {@code DEFAULT_CATEGORY_SAMPLES} per key when there is no usable
     * frequency signal (empty or all-zero counts).
     */
    private Map<String, Integer> perKeySamples(Map<String, Integer> freq, int rowCount) {
        Map<String, Integer> quotas = new LinkedHashMap<>();
        long total = 0L;
        for (int count : freq.values()) {
            if (count > 0) {
                total += count;
            }
        }
        if (total <= 0) {
            for (String key : freq.keySet()) {
                quotas.put(key, DEFAULT_CATEGORY_SAMPLES);
            }
            return quotas;
        }
        double[] remainders = new double[freq.size()];
        List<String> keys = new ArrayList<>(freq.keySet());
        long assigned = 0L;
        for (int i = 0; i < keys.size(); i++) {
            long count = Math.max(0, freq.get(keys.get(i)));
            double exact = (double) count * rowCount / total;
            int quota = Math.max(DEFAULT_CATEGORY_SAMPLES, (int) Math.round(exact));
            quotas.put(keys.get(i), quota);
            remainders[i] = exact - Math.floor(exact);
            assigned += quota;
        }
        // Normalize: trim from smallest remainders, or top up largest ones.
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            order.add(i);
        }
        if (assigned > rowCount) {
            order.sort((a, b) -> Double.compare(remainders[a], remainders[b]));
            long excess = assigned - rowCount;
            for (int idx : order) {
                if (excess <= 0) {
                    break;
                }
                String key = keys.get(idx);
                int quota = quotas.get(key);
                int cut = (int) Math.min(excess, quota - DEFAULT_CATEGORY_SAMPLES);
                if (cut > 0) {
                    quotas.put(key, quota - cut);
                    excess -= cut;
                }
            }
        } else if (assigned < rowCount) {
            order.sort((a, b) -> Double.compare(remainders[b], remainders[a]));
            long deficit = rowCount - assigned;
            int pos = 0;
            while (deficit > 0 && !order.isEmpty()) {
                String key = keys.get(order.get(pos % order.size()));
                quotas.put(key, quotas.get(key) + 1);
                deficit--;
                pos++;
            }
        }
        return quotas;
    }

    /** True for person-name columns, e.g. "name" or "customer_name". */
    private boolean isNameColumn(String columnName) {
        String normalized = columnName.toLowerCase()
                .replace("_", "")
                .replace("-", "")
                .replace(" ", "");
        return NAME_HINTS.contains(normalized);
    }

    private String buildHeader(List<DatasetColumn> columns) {
        StringBuilder header = new StringBuilder();
        for (int i = 0; i < columns.size(); i++) {
            if (i > 0) {
                header.append(',');
            }
            header.append(csvFileService.escape(columns.get(i).getColumnName()));
        }
        return header.toString();
    }

    private List<String> extractColumn(List<Map<String, String>> rows, String name) {
        List<String> values = new ArrayList<>();
        for (Map<String, String> row : rows) {
            String value = row.get(name);
            if (value != null && !value.isBlank()) {
                values.add(value.trim());
            }
        }
        return values;
    }

    /** Builds a LocalDate range from the original date values. */
    private LocalDate[] dateRange(List<String> values) {
        LocalDate min = null;
        LocalDate max = null;
        for (String value : values) {
            LocalDate parsed = parseDateSafe(value);
            if (parsed != null) {
                if (min == null || parsed.isBefore(min)) {
                    min = parsed;
                }
                if (max == null || parsed.isAfter(max)) {
                    max = parsed;
                }
            }
        }
        if (min == null) {                                  // nothing parseable
            LocalDate today = LocalDate.now();
            return new LocalDate[] { today.minusDays(365), today };
        }
        return new LocalDate[] { min, max };
    }

    private LocalDate parseDateSafe(String value) {
        for (java.time.format.DateTimeFormatter format : SchemaDetectionService.DATE_FORMATS) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // try the next supported format
            }
        }
        return null;
    }

    private long parseLongSafe(String value, long fallback) {
        try {
            return Long.parseLong(value.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    private double parseDoubleSafe(String value, double fallback) {
        try {
            return Double.parseDouble(value.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    private LocalDate randomBetween(LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end);
        if (days <= 0) {
            return start;
        }
        return start.plusDays(random.nextLong(days + 1));
    }

    private String randomDigits(int count) {
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < count; i++) {
            digits.append(random.nextInt(10));
        }
        return digits.toString();
    }

    private String randomLetters(int count) {
        StringBuilder letters = new StringBuilder();
        for (int i = 0; i < count; i++) {
            letters.append(randomLetter());
        }
        return letters.toString();
    }

    private char randomLetter() {
        return (char) ('A' + random.nextInt(26));
    }
}

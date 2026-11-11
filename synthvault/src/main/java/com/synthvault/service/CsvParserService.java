package com.synthvault.service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.synthvault.exception.InvalidFileException;

/**
 * A hand-written, quote-aware CSV parser - pure core Java (StringBuilder state
 * machine). No third-party CSV library is used anywhere in this project.
 */
@Service
public class CsvParserService {

    private final CsvFileService csvFileService;

    public CsvParserService(CsvFileService csvFileService) {
        this.csvFileService = csvFileService;
    }

    /** Simple result holder: header names + data rows (one Map per row). */
    public static class CsvTable {

        private final List<String> headers;
        private final List<Map<String, String>> rows;

        public CsvTable(List<String> headers, List<Map<String, String>> rows) {
            this.headers = headers;
            this.rows = rows;
        }

        public List<String> getHeaders() { return headers; }
        public List<Map<String, String>> getRows() { return rows; }
    }

    /** Parses the file: line 1 = header, remaining lines = data rows. */
    public CsvTable parse(Path file) {
        List<String> lines = csvFileService.readAllLines(file);
        if (lines.isEmpty()) {
            throw new InvalidFileException("CSV file is empty");
        }

        List<String> headers = new ArrayList<>();
        for (String cell : splitLine(lines.get(0))) {
            headers.add(cell.trim());
        }
        for (String header : headers) {
            if (header.isBlank()) {
                throw new InvalidFileException("Header row contains a blank column name");
            }
        }

        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) {
                continue;                                   // skip empty lines
            }
            List<String> cells = splitLine(line);
            if (cells.size() != headers.size()) {
                throw new InvalidFileException("Row " + (i + 1) + " has " + cells.size()
                        + " values, expected " + headers.size());
            }
            Map<String, String> row = new LinkedHashMap<>(); // keeps column order
            for (int c = 0; c < headers.size(); c++) {
                row.put(headers.get(c), cells.get(c));
            }
            rows.add(row);
        }
        return new CsvTable(headers, rows);
    }

    /**
     * Character-level CSV splitting:
     * - a comma inside "quotes" does NOT split
     * - "" inside quotes is an escaped quote
     */
    private List<String> splitLine(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (inQuotes) {
                if (ch == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        cell.append('"');                   // escaped quote ""
                        i++;
                    } else {
                        inQuotes = false;                   // closing quote
                    }
                } else {
                    cell.append(ch);
                }
            } else if (ch == '"') {
                inQuotes = true;                            // opening quote
            } else if (ch == ',') {
                cells.add(cell.toString());
                cell.setLength(0);
            } else {
                cell.append(ch);
            }
        }
        cells.add(cell.toString());
        return cells;
    }
}

package com.synthvault.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.synthvault.exception.AppException;
import com.synthvault.exception.ResourceNotFoundException;

/**
 * Saves and reads CSV files on the local disk (uploads/ and synthetic/ folders)
 * using java.nio - pure core Java, no cloud storage involved.
 */
@Service
public class CsvFileService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.synthetic.dir}")
    private String syntheticDir;

    /** Saves uploaded bytes as uploads/<uuid>.csv and returns its path. */
    public Path saveUpload(MultipartFile file) {
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath();   // absolute -> safe transferTo
            Files.createDirectories(dir);
            Path target = dir.resolve(UUID.randomUUID() + ".csv");
            file.transferTo(target.toFile());
            return target;
        } catch (IOException e) {
            throw new AppException(500, "Could not store uploaded file: " + e.getMessage());
        }
    }

    public List<String> readAllLines(Path path) {
        try {
            return Files.readAllLines(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new AppException(500, "Could not read file: " + e.getMessage());
        }
    }

    /** Writes the generated synthetic CSV into the synthetic/ folder. */
    public Path saveSyntheticCsv(String header, List<String[]> rows) {
        try {
            Path dir = Paths.get(syntheticDir).toAbsolutePath();
            Files.createDirectories(dir);
            Path target = dir.resolve(UUID.randomUUID() + ".csv");
            List<String> lines = new ArrayList<>();
            lines.add(header);
            for (String[] row : rows) {
                lines.add(joinRow(row));
            }
            Files.write(target, lines, StandardCharsets.UTF_8);
            return target;
        } catch (IOException e) {
            throw new AppException(500, "Could not write synthetic file: " + e.getMessage());
        }
    }

    /** Joins one row, quoting values that contain commas or quotes (CSV rule). */
    private String joinRow(String[] row) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < row.length; i++) {
            if (i > 0) {
                line.append(',');
            }
            line.append(escape(row[i]));
        }
        return line.toString();
    }

    /** Public so the header row can be escaped the same way. */
    public String escape(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /** Wraps a stored file for HTTP download. */
    public Resource loadAsResource(Path path) {
        FileSystemResource resource = new FileSystemResource(path);
        if (!resource.exists()) {
            throw new ResourceNotFoundException("File not found on disk");
        }
        return resource;
    }
}

package com.synthvault.service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.synthvault.dao.ColumnDao;
import com.synthvault.dao.DatasetDao;
import com.synthvault.dao.ProjectDao;
import com.synthvault.dao.ReportDao;
import com.synthvault.dto.ColumnAnalysisResponse;
import com.synthvault.dto.DatasetAnalysisResponse;
import com.synthvault.dto.DatasetSummaryResponse;
import com.synthvault.dto.PrivacyReportResponse;
import com.synthvault.exception.InvalidFileException;
import com.synthvault.exception.ResourceNotFoundException;
import com.synthvault.model.Dataset;
import com.synthvault.model.DatasetColumn;
import com.synthvault.model.DatasetStatus;
import com.synthvault.model.PrivacyReport;
import com.synthvault.model.Project;
import com.synthvault.model.Role;
import com.synthvault.model.User;
import com.synthvault.service.CsvParserService.CsvTable;

/**
 * Orchestrates the whole upload pipeline:
 * validate -> store on disk -> parse -> detect types -> detect PII ->
 * score privacy -> persist everything in one JDBC transaction.
 */
@Service
public class DatasetService {

    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;   // 5 MB
    private static final int PREVIEW_ROWS = 5;

    private final CsvFileService csvFileService;
    private final CsvParserService csvParserService;
    private final SchemaDetectionService schemaDetectionService;
    private final PiiDetectionService piiDetectionService;
    private final PrivacyScoringService privacyScoringService;
    private final DatasetDao datasetDao;
    private final ColumnDao columnDao;
    private final ReportDao reportDao;
    private final ProjectDao projectDao;
    private final ProjectService projectService;

    public DatasetService(CsvFileService csvFileService,
                          CsvParserService csvParserService,
                          SchemaDetectionService schemaDetectionService,
                          PiiDetectionService piiDetectionService,
                          PrivacyScoringService privacyScoringService,
                          DatasetDao datasetDao,
                          ColumnDao columnDao,
                          ReportDao reportDao,
                          ProjectDao projectDao,
                          ProjectService projectService) {
        this.csvFileService = csvFileService;
        this.csvParserService = csvParserService;
        this.schemaDetectionService = schemaDetectionService;
        this.piiDetectionService = piiDetectionService;
        this.privacyScoringService = privacyScoringService;
        this.datasetDao = datasetDao;
        this.columnDao = columnDao;
        this.reportDao = reportDao;
        this.projectDao = projectDao;
        this.projectService = projectService;
    }

    public DatasetAnalysisResponse uploadAndAnalyze(User user, Long projectId, MultipartFile file) {
        Project project = projectService.getOwned(projectId, user);
        validateFile(file);

        Path stored = csvFileService.saveUpload(file);
        CsvTable table = csvParserService.parse(stored);

        List<DatasetColumn> columns = analyzeColumns(table);
        PrivacyReport report = privacyScoringService.buildReport(columns);

        Dataset dataset = new Dataset();
        dataset.setProjectId(project.getId());
        dataset.setOriginalName(originalNameOf(file));
        dataset.setFileName(stored.getFileName().toString());
        dataset.setFilePath(stored.toString());
        dataset.setRowCount(table.getRows().size());
        dataset.setColumnCount(table.getHeaders().size());
        dataset.setStatus(DatasetStatus.PROCESSED);

        datasetDao.saveWithAnalysis(dataset, columns, report);   // one transaction
        return toAnalysisResponse(dataset, columns, report, table.getRows());
    }

    public List<DatasetSummaryResponse> listByProject(User user, Long projectId) {
        projectService.getOwned(projectId, user);
        List<DatasetSummaryResponse> out = new ArrayList<>();
        for (Dataset dataset : datasetDao.findByProjectId(projectId)) {
            out.add(toSummary(dataset));
        }
        return out;
    }

    /** Ownership rule for datasets: owner of the parent project, or ADMIN. */
    public Dataset getOwned(Long datasetId, User user) {
        Dataset dataset = datasetDao.findById(datasetId)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found: " + datasetId));
        Project project = projectDao.findById(dataset.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found for dataset"));
        boolean owner = project.getUserId().equals(user.getId());
        if (!owner && user.getRole() != Role.ADMIN) {
            throw new ResourceNotFoundException("Dataset not found: " + datasetId);
        }
        return dataset;
    }

    /** Re-reads the stored file to show schema + PII + report + 5-row preview. */
    public DatasetAnalysisResponse getAnalysis(User user, Long datasetId) {
        Dataset dataset = getOwned(datasetId, user);
        List<DatasetColumn> columns = columnDao.findByDatasetId(datasetId);
        PrivacyReport report = reportDao.findByDatasetId(datasetId).orElse(null);
        CsvTable table = csvParserService.parse(Path.of(dataset.getFilePath()));
        return toAnalysisResponse(dataset, columns, report, table.getRows());
    }

    // ------------------------------------------------------------------ private

    /** Detects type + PII + stats for every column, in header order. */
    private List<DatasetColumn> analyzeColumns(CsvTable table) {
        List<DatasetColumn> columns = new ArrayList<>();
        for (String name : table.getHeaders()) {
            List<String> values = extractColumn(table.getRows(), name);
            DatasetColumn col = new DatasetColumn();
            col.setColumnName(name);
            col.setColumnType(schemaDetectionService.detectType(values));
            col.setPiiType(piiDetectionService.detectPii(name, values));
            col.setDistinctCount(new LinkedHashSet<>(values).size());
            String[] range = schemaDetectionService.computeRange(col.getColumnType(), values);
            if (range != null) {
                col.setMinValue(range[0]);
                col.setMaxValue(range[1]);
            }
            columns.add(col);
        }
        return columns;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Please choose a CSV file");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".csv")) {
            throw new InvalidFileException("Only .csv files are allowed");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidFileException("Maximum file size is 5 MB");
        }
    }

    /** Pulls one column's non-blank values out of the parsed rows. */
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

    private String originalNameOf(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank()) {
            return "dataset.csv";
        }
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        return slash >= 0 ? name.substring(slash + 1) : name;
    }

    private DatasetAnalysisResponse toAnalysisResponse(Dataset dataset,
                                                       List<DatasetColumn> columns,
                                                       PrivacyReport report,
                                                       List<Map<String, String>> rows) {
        List<ColumnAnalysisResponse> columnDtos = new ArrayList<>();
        for (DatasetColumn col : columns) {
            columnDtos.add(new ColumnAnalysisResponse(
                    col.getColumnName(),
                    col.getColumnType().name(),
                    col.getPiiType().name(),
                    col.getDistinctCount(),
                    col.getMinValue(),
                    col.getMaxValue()));
        }

        List<List<String>> preview = new ArrayList<>();
        int limit = Math.min(PREVIEW_ROWS, rows.size());
        for (int i = 0; i < limit; i++) {
            preview.add(new ArrayList<>(rows.get(i).values()));
        }

        PrivacyReportResponse reportDto = null;
        if (report != null) {
            reportDto = new PrivacyReportResponse(
                    report.getRiskScore(),
                    report.getRiskLevel().name(),
                    report.getPiiColumnCount(),
                    report.getDetails());
        }

        return new DatasetAnalysisResponse(
                dataset.getId(),
                dataset.getProjectId(),
                dataset.getOriginalName(),
                dataset.getRowCount(),
                dataset.getColumnCount(),
                dataset.getStatus().name(),
                columnDtos,
                reportDto,
                preview);
    }

    private DatasetSummaryResponse toSummary(Dataset dataset) {
        return new DatasetSummaryResponse(
                dataset.getId(),
                dataset.getOriginalName(),
                dataset.getRowCount(),
                dataset.getColumnCount(),
                dataset.getStatus().name(),
                dataset.getUploadedAt().toString());
    }
}

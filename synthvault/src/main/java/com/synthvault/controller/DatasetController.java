package com.synthvault.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.synthvault.dao.SyntheticDao;
import com.synthvault.dto.DatasetAnalysisResponse;
import com.synthvault.dto.DatasetSummaryResponse;
import com.synthvault.dto.GenerationRequest;
import com.synthvault.dto.SyntheticDatasetResponse;
import com.synthvault.exception.ResourceNotFoundException;
import com.synthvault.model.SyntheticDataset;
import com.synthvault.model.User;
import com.synthvault.service.AuthService;
import com.synthvault.service.CsvFileService;
import com.synthvault.service.DatasetService;
import com.synthvault.service.SyntheticGenerationService;

import java.nio.file.Paths;

/** Upload + analysis + generation + download endpoints. */
@RestController
public class DatasetController {

    private final AuthService authService;
    private final DatasetService datasetService;
    private final SyntheticGenerationService generationService;
    private final SyntheticDao syntheticDao;
    private final CsvFileService csvFileService;

    public DatasetController(AuthService authService,
                             DatasetService datasetService,
                             SyntheticGenerationService generationService,
                             SyntheticDao syntheticDao,
                             CsvFileService csvFileService) {
        this.authService = authService;
        this.datasetService = datasetService;
        this.generationService = generationService;
        this.syntheticDao = syntheticDao;
        this.csvFileService = csvFileService;
    }

    /** Upload a CSV: validates, stores, parses, analyzes, scores and persists. */
    @PostMapping("/api/projects/{projectId}/datasets")
    @ResponseStatus(HttpStatus.CREATED)
    public DatasetAnalysisResponse upload(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                          @PathVariable("projectId") Long projectId,
                                          @RequestParam("file") MultipartFile file) {
        User user = authService.requireUser(token);
        return datasetService.uploadAndAnalyze(user, projectId, file);
    }

    @GetMapping("/api/projects/{projectId}/datasets")
    public List<DatasetSummaryResponse> list(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                             @PathVariable("projectId") Long projectId) {
        return datasetService.listByProject(authService.requireUser(token), projectId);
    }

    /** Schema + PII + privacy report + 5-row preview. */
    @GetMapping("/api/datasets/{id}/analysis")
    public DatasetAnalysisResponse analysis(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                            @PathVariable("id") Long id) {
        return datasetService.getAnalysis(authService.requireUser(token), id);
    }

    /** Generates the synthetic CSV (synchronous - fast for <= 100k rows). */
    @PostMapping("/api/datasets/{id}/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public SyntheticDatasetResponse generate(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                             @PathVariable("id") Long id,
                                             @RequestBody GenerationRequest request) {
        return generationService.generate(authService.requireUser(token), id, request);
    }

    /** Downloads the generated synthetic CSV as an attachment. */
    @GetMapping("/api/datasets/{id}/synthetic/download")
    public ResponseEntity<Resource> download(@RequestHeader(value = "X-Auth-Token", required = false) String token,
                                             @PathVariable("id") Long id) {
        User user = authService.requireUser(token);
        datasetService.getOwned(id, user);                  // ownership guard
        SyntheticDataset synthetic = syntheticDao.findByDatasetId(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No synthetic dataset yet - call /generate first"));
        Resource file = csvFileService.loadAsResource(Paths.get(synthetic.getFilePath()));

        String fileName = "synthetic-dataset-" + id + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(file);
    }
}

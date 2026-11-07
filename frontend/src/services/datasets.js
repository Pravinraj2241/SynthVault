import api from './api';

/**
 * Dataset service.
 *
 * Verified against DatasetController (synthvault-mca):
 *   POST /api/projects/{projectId}/datasets   multipart, field name "file"
 *        -> 201 DatasetAnalysisResponse { id, projectId, originalName,
 *             rowCount, columnCount, status, columns[], privacyReport, preview[][] }
 *   GET  /api/projects/{projectId}/datasets   -> DatasetSummaryResponse[]
 *        -> { id, originalName, rowCount, columnCount, status, uploadedAt }
 *   GET  /api/datasets/{id}/analysis          -> DatasetAnalysisResponse
 *
 * Part 2 contract function list - backend status of each:
 *   listDatasets            -> real (above)
 *   uploadDataset           -> real (above)
 *   uploadDatasetSmart      -> multipart is the ONLY backend-supported
 *                              strategy, so "smart" delegates to uploadDataset
 *   buildMultipart          -> frontend helper used by uploadDataset
 *   getSchema / getPreview  -> served by the real analysis endpoint
 *   initChunkedUpload / uploadChunk / completeChunkedUpload
 *                           -> NO backend endpoints exist; deliberately NOT
 *                              implemented (would be invented APIs)
 *   confirmSchema (PII override)
 *                           -> NO backend endpoint/DTO exists; deliberately
 *                              NOT implemented
 */

function datasetPath(datasetId) {
  return `/api/datasets/${encodeURIComponent(String(datasetId))}`;
}

/** Builds the multipart body with the exact field name the backend expects. */
export function buildMultipart(file) {
  const form = new FormData();
  form.append('file', file);
  return form;
}

export async function listDatasets(projectId) {
  const { data } = await api.get(`/api/projects/${encodeURIComponent(String(projectId))}/datasets`);
  return Array.isArray(data) ? data : [];
}

/**
 * Uploads a CSV and receives the full schema/PII/privacy analysis.
 *
 * @param {number|string} projectId
 * @param {File} file
 * @param {{ onProgress?: (percent: number|null) => void, signal?: AbortSignal }} [options]
 */
export async function uploadDataset(projectId, file, options = {}) {
  const { onProgress, signal } = options;

  const { data } = await api.post(
    `/api/projects/${encodeURIComponent(String(projectId))}/datasets`,
    buildMultipart(file),
    {
      signal,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (typeof onProgress !== 'function') {
          return;
        }
        if (typeof event.total === 'number' && event.total > 0) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        } else {
          onProgress(null);
        }
      },
    },
  );

  return data;
}

/**
 * Contract upload entry point. The backend supports exactly one workflow
 * (direct multipart - no upload sessions, no chunking), so "smart" means
 * multipart here. Nothing is invented beyond the verified contract.
 */
export async function uploadDatasetSmart(projectId, file, options = {}) {
  return uploadDataset(projectId, file, options);
}

/** Schema + PII + privacy report + 5-row preview for one dataset. */
export async function getDatasetAnalysis(datasetId) {
  const { data } = await api.get(`${datasetPath(datasetId)}/analysis`);
  return data;
}

/** Detected schema columns (ColumnAnalysisResponse[]) via the analysis endpoint. */
export async function getSchema(datasetId) {
  const analysis = await getDatasetAnalysis(datasetId);
  return Array.isArray(analysis?.columns) ? analysis.columns : [];
}

/** Backend-provided preview rows via the analysis endpoint. */
export async function getPreview(datasetId) {
  const analysis = await getDatasetAnalysis(datasetId);
  return Array.isArray(analysis?.preview) ? analysis.preview : [];
}

/** Convenience helper: the dataset's stored columns. */
export async function listDatasetColumns(datasetId) {
  return getSchema(datasetId);
}

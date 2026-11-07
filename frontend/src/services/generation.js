import api from './api';

/**
 * Synthetic data generation + download.
 *
 * Verified against DatasetController:
 *   POST /api/datasets/{id}/generate { rowCount }
 *        -> 201 SyntheticDatasetResponse { id, datasetId, rowCount, downloadUrl, createdAt }
 *   GET  /api/datasets/{id}/synthetic/download
 *        -> text/csv attachment with Content-Disposition (requires auth header)
 *
 * The download is fetched as a Blob and saved with a Blob URL so the access
 * token is sent in a request header and never placed in a URL. The backend's
 * Content-Disposition filename is preferred; the fallback name is used only
 * when the header is missing.
 */

/**
 * @param {number|string} datasetId
 * @param {number} rowCount
 */
export async function generateSyntheticData(datasetId, rowCount) {
  const { data } = await api.post(
    `/api/datasets/${encodeURIComponent(String(datasetId))}/generate`,
    { rowCount },
  );
  return data;
}

/** Parses RFC 6266 Content-Disposition into a safe file name (or null). */
export function fileNameFromDisposition(header) {
  if (typeof header !== 'string' || header.length === 0) {
    return null;
  }
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      /* fall through to the plain form */
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  const name = plainMatch?.[1]?.trim();
  return name && name.length > 0 ? name : null;
}

/**
 * Fetches the generated CSV.
 * @returns {Promise<{ blob: Blob, fileName: string|null }>}
 */
export async function fetchSyntheticCsv(datasetId) {
  const response = await api.get(
    `/api/datasets/${encodeURIComponent(String(datasetId))}/synthetic/download`,
    { responseType: 'blob' },
  );
  return {
    blob: response.data,
    fileName: fileNameFromDisposition(response.headers?.['content-disposition']),
  };
}

/**
 * Downloads the generated CSV through the browser.
 * The token travels in the request header, never in the URL.
 */
export async function downloadSyntheticCsv(datasetId, fallbackName) {
  const { blob, fileName } = await fetchSyntheticCsv(datasetId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || fallbackName || `synthetic-dataset-${datasetId}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

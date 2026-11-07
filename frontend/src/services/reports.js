import { getDatasetAnalysis } from './datasets';

/**
 * Privacy reporting service.
 *
 * Verified against the backend: there is no standalone /api/reports endpoint.
 * The privacy report is embedded in the dataset analysis payload
 * (DatasetAnalysisResponse.privacyReport =
 *  PrivacyReportResponse { riskScore, riskLevel, piiColumnCount, details }),
 * so this module derives reports from that endpoint instead of inventing a new
 * API.
 */

/**
 * @param {number|string} datasetId
 * @returns {Promise<{riskScore: number, riskLevel: string, piiColumnCount: number, details: string}|null>}
 */
export async function getPrivacyReport(datasetId) {
  const analysis = await getDatasetAnalysis(datasetId);
  return analysis?.privacyReport ?? null;
}

/** The columns that carry detected personal data (piiType !== 'NONE'). */
export async function getPiiColumns(datasetId) {
  const analysis = await getDatasetAnalysis(datasetId);
  const columns = Array.isArray(analysis?.columns) ? analysis.columns : [];
  return columns.filter((column) => column?.piiType && column.piiType !== 'NONE');
}

/**
 * Presentation helper for the risk badge.
 * Colour is never the only signal - the label text is always returned too.
 */
export function describeRiskLevel(riskLevel) {
  switch (String(riskLevel || '').toUpperCase()) {
    case 'LOW':
      return { label: 'LOW', tone: 'safe' };
    case 'MEDIUM':
      return { label: 'MEDIUM', tone: 'caution' };
    case 'HIGH':
      return { label: 'HIGH', tone: 'warning' };
    case 'CRITICAL':
      return { label: 'CRITICAL', tone: 'danger' };
    default:
      return { label: 'NOT SCORED', tone: 'neutral' };
  }
}
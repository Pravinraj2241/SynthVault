import { useCallback, useEffect, useState } from 'react';

import Alert from '../components/Alert';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import RouteLink from '../components/RouteLink';
import { SkeletonBlock } from '../components/PageSkeleton';
import * as datasetsService from '../services/datasets';
import * as generationService from '../services/generation';
import { toApiError } from '../utils/errors';
import { formatDateTime, formatNumber } from '../utils/format';

/**
 * PAGE 7 - Generate Synthetic Data + Results (protected "/datasets/:datasetId/generate").
 * Built strictly to the Part 3 specification.
 *
 * Verified backend contract (DatasetController + SyntheticGenerationService):
 *   POST /api/datasets/{id}/generate  { rowCount: 1..100000 }
 *        -> 201 SyntheticDatasetResponse { id, datasetId, rowCount, downloadUrl, createdAt }
 *   GET  /api/datasets/{id}/synthetic/download -> text/csv + Content-Disposition
 *
 * Backend facts honoured here (nothing invented):
 *   - generation is SYNCHRONOUS: there is no GenerationController, no job
 *     endpoint (GET /api/jobs/{id}) and no JobStatus enum, so no polling is
 *     implemented and no fake job state is displayed
 *   - there is no similarity report endpoint
 *     (GET /api/reports/similarity/{id} is not implemented), so the
 *     Similarity Report section shows an honest "not available" state
 *   - the CSV downloads as a Blob so the token never enters a URL; the
 *     backend's Content-Disposition filename is preferred
 */

const MIN_ROWS = 1;
const MAX_ROWS = 100000; /* SyntheticGenerationService.MAX_ROWS */
const ROW_STEP = 1000;

export default function GeneratePage({ datasetId }) {
  const [analysisState, setAnalysisState] = useState({ status: 'loading', data: null, error: null });
  const [rowCount, setRowCount] = useState('1000');
  const [rowError, setRowError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const loadAnalysis = useCallback(async () => {
    setAnalysisState({ status: 'loading', data: null, error: null });
    try {
      const data = await datasetsService.getDatasetAnalysis(datasetId);
      setAnalysisState({ status: 'ready', data, error: null });
    } catch (error) {
      setAnalysisState({ status: 'error', data: null, error: toApiError(error) });
    }
  }, [datasetId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const changeRowCount = (value) => {
    setRowCount(value);
    setRowError(null);
  };

  const stepRowCount = (delta) => {
    const current = Number(rowCount);
    const base = Number.isFinite(current) && current > 0 ? current : 1000;
    const next = Math.min(MAX_ROWS, Math.max(MIN_ROWS, base + delta));
    setRowCount(String(next));
    setRowError(null);
  };

  const requestGeneration = (event) => {
    event.preventDefault();
    const parsed = Number(rowCount);
    if (!Number.isInteger(parsed) || parsed < MIN_ROWS || parsed > MAX_ROWS) {
      setRowError(`Row count must be a whole number between ${formatNumber(MIN_ROWS)} and ${formatNumber(MAX_ROWS)}.`);
      return;
    }
    setGenerateError(null);
    setConfirmOpen(true);
  };

  const performGeneration = async () => {
    const parsed = Number(rowCount);
    setConfirmOpen(false);
    setIsGenerating(true);
    setGenerateError(null);
    setResult(null);
    setDownloadError(null);
    try {
      const response = await generationService.generateSyntheticData(datasetId, parsed);
      setResult(response);
    } catch (error) {
      setGenerateError(toApiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCsv = async () => {
    if (isDownloading) {
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await generationService.downloadSyntheticCsv(
        datasetId,
        `synthetic-dataset-${datasetId}.csv`,
      );
    } catch (error) {
      setDownloadError(toApiError(error));
    } finally {
      setIsDownloading(false);
    }
  };

  const datasetErrorTitle =
    analysisState.error?.status === 404
      ? 'Dataset not found.'
      : analysisState.error?.status === 403
        ? 'You do not have access to this dataset.'
        : 'Unable to load this dataset.';

  const generateErrorTitle =
    generateError?.status === 403
      ? 'You do not have access to this dataset.'
      : generateError?.status === 404
        ? 'Dataset or generation job not found.'
        : generateError?.status === 409
          ? 'Generation conflict.'
          : generateError?.status === 429
            ? 'Rate limit reached. Please wait and try again.'
            : generateError?.status >= 500
              ? 'Something went wrong while generating the dataset.'
              : 'Generation failed.';

  const parsedRowCount = Number(rowCount);

  return (
    <AppLayout
      title="Generate Synthetic Data"
      description="Configure the row count, start the generation and download the result."
    >
      {analysisState.status === 'loading' ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-live="polite" aria-label="Loading dataset">
          <SkeletonBlock className="sv-card h-56" />
          <SkeletonBlock className="sv-card h-56" />
        </div>
      ) : analysisState.status === 'error' ? (
        <Alert
          tone="error"
          title={datasetErrorTitle}
          message={analysisState.error?.message}
          onRetry={loadAnalysis}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ---- Dataset summary + configuration (left panel) ---- */}
            <div className="space-y-6">
              <section className="sv-card" aria-labelledby="dataset-summary-heading">
                <h2 id="dataset-summary-heading" className="text-base font-semibold text-slate-900">
                  Dataset summary
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">Dataset</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {analysisState.data?.originalName || '-'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                      {analysisState.data?.status || '-'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">Rows</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                      {formatNumber(analysisState.data?.rowCount)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <dt className="text-xs text-slate-500">Columns</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                      {formatNumber(analysisState.data?.columnCount)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="sv-card" aria-labelledby="config-heading">
                <h2 id="config-heading" className="text-base font-semibold text-slate-900">
                  Generation Configuration
                </h2>
                <form onSubmit={requestGeneration} noValidate>
                  {generateError ? (
                    <Alert
                      tone="error"
                      title={generateErrorTitle}
                      message={generateError.message}
                      onRetry={requestGeneration}
                      retryLabel="Try Again"
                      className="mb-4 mt-3"
                    />
                  ) : null}

                  <label htmlFor="row-count" className="sv-label mt-3">
                    Number of Synthetic Rows
                  </label>
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => stepRowCount(-ROW_STEP)}
                      disabled={isGenerating}
                      aria-label={`Decrease row count by ${formatNumber(ROW_STEP)}`}
                      className="sv-btn sv-btn-secondary !px-4"
                    >
                      &minus;
                    </button>
                    <input
                      id="row-count"
                      type="number"
                      min={MIN_ROWS}
                      max={MAX_ROWS}
                      step={1}
                      value={rowCount}
                      onChange={(event) => changeRowCount(event.target.value)}
                      disabled={isGenerating}
                      aria-required="true"
                      aria-invalid={rowError ? 'true' : undefined}
                      aria-describedby={rowError ? 'row-count-error' : undefined}
                      className="sv-input text-center"
                    />
                    <button
                      type="button"
                      onClick={() => stepRowCount(ROW_STEP)}
                      disabled={isGenerating}
                      aria-label={`Increase row count by ${formatNumber(ROW_STEP)}`}
                      className="sv-btn sv-btn-secondary !px-4"
                    >
                      +
                    </button>
                  </div>
                  {rowError ? (
                    <p id="row-count-error" role="alert" className="mt-1 text-xs text-red-700">
                      {rowError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">
                      Between {formatNumber(MIN_ROWS)} and {formatNumber(MAX_ROWS)} rows (backend
                      limit).
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating}
                    aria-busy={isGenerating || undefined}
                    className="sv-btn sv-btn-primary mt-5 w-full sm:w-auto"
                  >
                    Generate Synthetic Data
                  </button>
                </form>
              </section>
            </div>


            {/* ---- Progress + result (right panel) ---- */}
            <section className="sv-card" aria-labelledby="result-heading">
              <h2 id="result-heading" className="text-base font-semibold text-slate-900">
                Result
              </h2>

              {!result && !isGenerating && !generateError ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                  Choose a row count and start the generation. The synthetic file keeps the
                  statistical shape of your data while every personal value is replaced with a
                  fabricated one.
                </p>
              ) : null}

              {isGenerating ? (
                <div className="mt-4" aria-live="polite">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                      <svg className="h-4 w-4 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                      Generation is processing...
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <SkeletonBlock className="h-16 w-full" />
                    <SkeletonBlock className="h-10 w-2/3" />
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="mt-4">
                  <Alert
                    tone="success"
                    title="Synthetic Data Ready"
                    message={`${formatNumber(result.rowCount)} synthetic rows were generated.`}
                  />
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Generated rows</dt>
                      <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                        {formatNumber(result.rowCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Created</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                        {formatDateTime(result.createdAt) || '-'}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Dataset ID</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                        {result.datasetId ?? '-'}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <dt className="text-xs text-slate-500">Synthetic dataset ID</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                        {result.id ?? '-'}
                      </dd>
                    </div>
                  </dl>

                  {downloadError ? (
                    <Alert
                      tone="error"
                      title="Download failed."
                      message={downloadError.message}
                      onRetry={downloadCsv}
                      className="mt-4"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={downloadCsv}
                    disabled={isDownloading}
                    aria-busy={isDownloading || undefined}
                    className="sv-btn sv-btn-primary mt-4 w-full sm:w-auto"
                  >
                    {isDownloading ? 'Preparing download...' : 'Download Synthetic CSV'}
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    The file downloads through an authenticated request - the access token is
                    never part of the URL.
                  </p>
                </div>
              ) : null}
            </section>

          </div>

          {/* ---- Similarity report (honest backend-dependency state) ---- */}
          <section className="sv-card" aria-labelledby="similarity-heading">
            <h2 id="similarity-heading" className="text-base font-semibold text-slate-900">
              Similarity Report
            </h2>
            <Alert
              tone="info"
              title="Similarity verification is not available."
              message="The connected backend does not expose a similarity report endpoint (GET /api/reports/similarity/{id} is not implemented), so no similarity score or per-column metrics can be shown. The frontend never calculates similarity itself."
              className="mt-3"
            />
          </section>

          {/* ---- Next actions (Part 3) ---- */}
          <section className="sv-card" aria-labelledby="next-actions-heading">
            <h2 id="next-actions-heading" className="text-base font-semibold text-slate-900">
              Next actions
            </h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <RouteLink
                to={`/datasets/${datasetId}/privacy`}
                className="sv-btn sv-btn-secondary w-full sm:w-auto"
              >
                Back to Privacy Analysis
              </RouteLink>
              <RouteLink to="/projects" className="sv-btn sv-btn-secondary w-full sm:w-auto">
                Back to Projects
              </RouteLink>
            </div>
          </section>

          {/* ---- Confirmation modal (Part 3) ---- */}
          <Modal
            open={confirmOpen}
            title="Generate Synthetic Data?"
            description={
              Number.isFinite(parsedRowCount)
                ? `You are about to generate ${formatNumber(parsedRowCount)} synthetic records.`
                : undefined
            }
            onClose={() => setConfirmOpen(false)}
          >
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="sv-btn sv-btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performGeneration}
                className="sv-btn sv-btn-primary w-full sm:w-auto"
              >
                Start Generation
              </button>
            </div>
          </Modal>

        </>
      )}
    </AppLayout>
  );
}


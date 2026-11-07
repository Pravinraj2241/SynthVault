import { useCallback, useEffect, useRef, useState } from 'react';

import Alert from '../components/Alert';
import AppLayout from '../components/AppLayout';
import Breadcrumb from '../components/Breadcrumb';
import RouteLink from '../components/RouteLink';
import { SkeletonBlock, Spinner } from '../components/PageSkeleton';
import * as datasetsService from '../services/datasets';
import * as projectsService from '../services/projects';
import { toApiError } from '../utils/errors';
import { formatBytes, formatNumber } from '../utils/format';

/**
 * PAGE 5 - Dataset Upload + Schema (protected "/projects/:projectId/datasets/new").
 * Built strictly to the Part 2 specification.
 *
 * Verified backend contract (DatasetController / DatasetService):
 *   POST /api/projects/{projectId}/datasets  multipart field "file"
 *        -> 201 DatasetAnalysisResponse (schema + PII + privacy + preview)
 *
 * Backend facts honoured here (nothing invented):
 *   - only .csv is accepted, maximum 5 MB (client validation mirrors backend)
 *   - schema analysis runs synchronously with upload - no polling exists
 *   - no chunked upload, no dataset-name field, no schema-confirmation
 *     endpoint exists, so none of those UI elements are rendered
 *
 * Native File API + native drag & drop. Upload happens only after explicit
 * user action; progress comes from Axios onUploadProgress; the browser is
 * prevented from opening files dropped outside the dropzone.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024; /* DatasetService.MAX_SIZE_BYTES */

/** Mirrors DatasetService.validateFile. */
function validateCsvFile(file) {
  if (!file) {
    return 'Please choose a CSV file';
  }
  const name = typeof file.name === 'string' ? file.name : '';
  if (!name.toLowerCase().endsWith('.csv')) {
    return 'Only .csv files are allowed';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'Maximum file size is 5 MB';
  }
  return null;
}

function ProgressBar({ progress }) {
  const indeterminate = progress === null || progress === undefined;
  return (
    <div className="mt-3">
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : progress}
        className="h-2 w-full overflow-hidden rounded bg-slate-100"
      >
        {indeterminate ? (
          <div className="h-full w-1/3 animate-pulse rounded bg-brand-500" />
        ) : (
          <div className="h-full rounded bg-brand-600" style={{ width: `${progress}%` }} />
        )}
      </div>
      <p aria-live="polite" className="mt-1 text-xs text-slate-500">
        {indeterminate ? 'Uploading…' : `${progress}% uploaded`}
      </p>
    </div>
  );
}

export default function DatasetUploadPage({ projectId }) {
  const [project, setProject] = useState({ status: 'loading', data: null, error: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const inputRef = useRef(null);

  /* Part 2: "Prevent the browser from opening dropped files" - page-wide. */
  useEffect(() => {
    const prevent = (event) => event.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const loadProject = useCallback(async () => {
    setProject({ status: 'loading', data: null, error: null });
    try {
      const data = await projectsService.getProject(projectId);
      setProject({ status: 'ready', data, error: null });
    } catch (error) {
      setProject({ status: 'error', data: null, error: toApiError(error) });
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const selectFile = (file) => {
    setUploadError(null);
    setAnalysis(null);
    const message = validateCsvFile(file);
    if (message) {
      setFileError(message);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setUploadError(null);
    setAnalysis(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (isUploading) {
      return;
    }
    selectFile(event.dataTransfer?.files?.[0] ?? null);
  };

  const startUpload = async () => {
    if (!selectedFile || isUploading) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setAnalysis(null);
    setProgress(null);
    try {
      const result = await datasetsService.uploadDatasetSmart(projectId, selectedFile, {
        onProgress: setProgress,
      });
      setAnalysis(result);
    } catch (error) {
      setUploadError(toApiError(error));
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const projectErrorTitle =
    project.error?.status === 403
      ? 'You do not have access to this project.'
      : project.error?.status === 404
        ? 'Project or dataset not found.'
        : 'Unable to load this project.';

  return (
    <AppLayout
      title="Upload Dataset"
      description="Upload a dataset to detect its schema and identify sensitive fields."
    >
      <Breadcrumb
        items={[
          { label: 'Projects', to: '/projects' },
          { label: project.data?.name || `Project ${projectId}` },
          { label: 'Upload Dataset' },
        ]}
      />

      {project.status === 'loading' ? (
        <SkeletonBlock className="sv-card h-40" />
      ) : project.status === 'error' ? (
        <Alert
          tone="error"
          title={projectErrorTitle}
          message={project.error?.message}
          onRetry={loadProject}
        />
      ) : (
        <div className={`grid gap-6 ${analysis || isUploading ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {/* ---- File dropzone (Part 2 UI) ---- */}
          <section className="sv-card" aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="text-base font-semibold text-slate-900">
              Upload Dataset
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Supported format: CSV (.csv), maximum 5 MB. JSON is not accepted by this backend.
            </p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isUploading) {
                  setDragActive(true);
                }
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${
                dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-900">Drag and drop your dataset here</p>
              <p className="mt-1 text-xs text-slate-500">or</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="sv-btn sv-btn-secondary mt-3"
              >
                Choose File
              </button>
              <label htmlFor="dataset-file-input" className="sr-only">
                Dataset file to upload
              </label>
              <input
                ref={inputRef}
                id="dataset-file-input"
                type="file"
                accept=".csv,text/csv"
                disabled={isUploading}
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>

            {/* Selected file card: filename, size, type, remove */}
            {selectedFile ? (
              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(selectedFile.size)} · {selectedFile.type || 'text/csv'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={isUploading}
                    className="sv-btn sv-btn-secondary !px-3 !py-1.5 !text-xs"
                  >
                    Remove
                  </button>
                </div>
                {isUploading ? (
                  <ProgressBar progress={progress} />
                ) : (
                  <button
                    type="button"
                    onClick={startUpload}
                    className="sv-btn sv-btn-primary mt-3 w-full sm:w-auto"
                  >
                    Upload Dataset
                  </button>
                )}
              </div>
            ) : null}

            {fileError ? (
              <Alert
                tone="warning"
                title="Please select a supported dataset file."
                message={fileError}
                className="mt-4"
              />
            ) : null}

            {uploadError ? (
              <Alert
                tone="error"
                title="Upload failed."
                message={uploadError.message}
                onRetry={startUpload}
                retryLabel="Retry Upload"
                className="mt-4"
              />
            ) : null}

          </section>

          {/* ---- Schema analysis (upload success transitions here) ---- */}
          <div className="space-y-6">
            {isUploading ? (
              <section className="sv-card" aria-live="polite">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <p className="text-sm font-medium text-slate-900">
                    Waiting for schema detection...
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <SkeletonBlock className="h-12 w-full" />
                  <SkeletonBlock className="h-40 w-full" />
                </div>
              </section>
            ) : analysis ? (
              <>
                <Alert
                  tone="success"
                  title="Dataset uploaded successfully."
                  message="Schema analysis is shown below."
                />

                <section className="sv-card" aria-labelledby="schema-heading">
                  <h2 id="schema-heading" className="text-base font-semibold text-slate-900">
                    Detected Schema
                  </h2>

                  {(analysis.columns || []).length === 0 ? (
                    <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                      Schema detection has not completed yet.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <caption className="sr-only">Columns detected in the uploaded dataset</caption>
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <th scope="col" className="py-2 pr-3 font-semibold">Column</th>
                            <th scope="col" className="py-2 pr-3 font-semibold">Data Type</th>
                            <th scope="col" className="py-2 pr-3 font-semibold">PII Type</th>
                            <th scope="col" className="py-2 pr-3 font-semibold">Distinct Values</th>
                            <th scope="col" className="py-2 pr-3 font-semibold">Min</th>
                            <th scope="col" className="py-2 font-semibold">Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysis.columns.map((column) => {
                            const hasPii = column.piiType && column.piiType !== 'NONE';
                            return (
                              <tr key={column.name}>
                                <td className="py-2 pr-3 font-medium text-slate-900">{column.name}</td>
                                <td className="py-2 pr-3 text-slate-600">{column.type}</td>
                                <td className="py-2 pr-3">
                                  {hasPii ? (
                                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                      {column.piiType}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                                      none
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">
                                  {column.distinctCount === null || column.distinctCount === undefined
                                    ? '-'
                                    : formatNumber(column.distinctCount)}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">{column.minValue ?? '-'}</td>
                                <td className="py-2 text-slate-600">{column.maxValue ?? '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Values are exactly as returned by the backend. Sensitivity overrides are not
                    supported by this API.
                  </p>
                </section>

                <section className="sv-card" aria-labelledby="preview-heading">
                  <h2 id="preview-heading" className="text-base font-semibold text-slate-900">
                    Dataset Preview
                  </h2>

                  {(analysis.preview || []).length === 0 ? (
                    <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                      No preview is available yet.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-xs">
                        <caption className="sr-only">
                          First rows of the uploaded file, exactly as returned by the backend
                        </caption>
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            {(analysis.columns || []).map((column) => (
                              <th key={column.name} scope="col" className="whitespace-nowrap py-2 pr-4 font-semibold">
                                {column.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysis.preview.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {(row || []).map((cell, cellIndex) => (
                                <td key={cellIndex} className="whitespace-nowrap py-1.5 pr-4 text-slate-600">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="sv-card" aria-labelledby="next-step-heading">
                  <h2 id="next-step-heading" className="text-base font-semibold text-slate-900">
                    Next step
                  </h2>
                  <RouteLink
                    to={`/datasets/${analysis.id}/privacy`}
                    className="sv-btn sv-btn-primary mt-3 w-full sm:w-auto"
                  >
                    Analyze Privacy
                  </RouteLink>
                </section>

              </>
            ) : null}
          </div>

        </div>
      )}
    </AppLayout>
  );
}



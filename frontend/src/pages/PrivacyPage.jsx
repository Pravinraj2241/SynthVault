import { useCallback, useEffect, useState } from 'react';

import Alert from '../components/Alert';
import AppLayout from '../components/AppLayout';
import Breadcrumb from '../components/Breadcrumb';
import RouteLink from '../components/RouteLink';
import { SkeletonBlock } from '../components/PageSkeleton';
import * as datasetsService from '../services/datasets';
import { describeRiskLevel } from '../services/reports';
import { toApiError } from '../utils/errors';
import { formatNumber } from '../utils/format';

/**
 * PAGE 6 - Privacy Analysis (protected "/datasets/:datasetId/privacy").
 * Built strictly to the Part 2 specification.
 *
 * Verified backend contract: there is NO /api/datasets/{id}/privacy endpoint
 * and NO ReportController in this backend build. The privacy report is
 * embedded in GET /api/datasets/{id}/analysis
 * (DatasetAnalysisResponse.privacyReport =
 *   { riskScore, riskLevel, piiColumnCount, details }).
 *
 * Backend facts honoured here (nothing invented):
 *   - the frontend NEVER calculates the score or risk level
 *   - k-anonymity, l-diversity and re-identification risk are NOT returned
 *     by the backend, so their metric cards show an honest "not available"
 *     state instead of values
 *   - per-column risk/sensitivity/reason/recommendation fields do not exist;
 *     the table shows only real ColumnAnalysisResponse fields
 *   - no privacy report download exists on the backend, so no download
 *     button is rendered
 *   - no recommendations are returned by the backend, so the section shows
 *     an empty state instead of self-generated advice
 */

const TONE_CLASSES = {
  safe: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'stroke-emerald-500' },
  caution: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-900', ring: 'stroke-amber-500' },
  warning: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-900', ring: 'stroke-orange-500' },
  danger: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-800', ring: 'stroke-red-500' },
  neutral: { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'stroke-slate-400' },
};

/** Semicircular 0-100 score visual (SVG, no chart library). */
function ScoreGauge({ score, level }) {
  const described = describeRiskLevel(level);
  const tone = TONE_CLASSES[described.tone] ?? TONE_CLASSES.neutral;
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[220px]" role="img" aria-label={`Privacy score: ${clamped} out of 100.`}>
        <title>{`Privacy score: ${clamped} out of 100.`}</title>
        <path
          d="M 14 104 A 86 86 0 0 1 186 104"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 14 104 A 86 86 0 0 1 186 104"
          fill="none"
          className={tone.ring}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${clamped} 100`}
        />
        <text x="100" y="92" textAnchor="middle" fontSize="34" fontWeight="700" fill="#0f172a">
          {clamped}
        </text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#64748b">
          {clamped}/100
        </text>
      </svg>
      <span className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tone.border} ${tone.bg} ${tone.text}`}>
        {described.label}
      </span>
    </div>
  );
}

function MetricCard({ label, value, note }) {
  const unavailable = value === null || value === undefined;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-slate-900">
        {unavailable ? <span className="text-sm font-medium text-slate-400">Not available</span> : value}
      </dd>
      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </div>
  );
}

export default function PrivacyPage({ datasetId }) {
  const [state, setState] = useState({ status: 'loading', analysis: null, error: null });

  const loadAnalysis = useCallback(async () => {
    setState({ status: 'loading', analysis: null, error: null });
    try {
      const analysis = await datasetsService.getDatasetAnalysis(datasetId);
      setState({ status: 'ready', analysis, error: null });
    } catch (error) {
      setState({ status: 'error', analysis: null, error: toApiError(error) });
    }
  }, [datasetId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const analysis = state.analysis;
  const report = analysis?.privacyReport ?? null;
  const columns = analysis?.columns || [];
  const piiColumns = columns.filter((column) => column?.piiType && column.piiType !== 'NONE');

  const errorTitle =
    state.error?.status === 404
      ? 'Dataset not found.'
      : state.error?.status === 403
        ? 'You do not have access to this dataset.'
        : 'Unable to load privacy analysis.';

  return (
    <AppLayout
      title="Privacy Analysis"
      description="Review the privacy risk detected in your dataset."
    >
      <Breadcrumb
        items={[
          { label: 'Projects', to: '/projects' },
          { label: 'Dataset' },
          { label: 'Privacy Analysis' },
        ]}
      />

      {state.status === 'loading' ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-live="polite" aria-label="Loading privacy analysis">
          <SkeletonBlock className="sv-card h-64" />
          <SkeletonBlock className="sv-card h-64" />
        </div>
      ) : state.status === 'error' ? (
        <Alert tone="error" title={errorTitle} message={state.error?.message} onRetry={loadAnalysis} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---- Score + dataset summary + metrics ---- */}
          <div className="space-y-6">
            <section className="sv-card" aria-labelledby="dataset-summary-heading">
              <h2 id="dataset-summary-heading" className="text-base font-semibold text-slate-900">
                Dataset summary
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">Dataset</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {analysis?.originalName || '-'}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                    {analysis?.status || '-'}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">Rows</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                    {formatNumber(analysis?.rowCount)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">Columns</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-slate-900">
                    {formatNumber(analysis?.columnCount)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="sv-card" aria-labelledby="score-heading">
              <h2 id="score-heading" className="text-base font-semibold text-slate-900">
                Privacy Score
              </h2>
              {report ? (
                <>
                  <div className="mt-4">
                    <ScoreGauge score={report.riskScore} level={report.riskLevel} />
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Returned directly by the backend (risk score 0&ndash;100; lower is safer).
                  </p>
                </>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                  Privacy analysis is not ready yet.
                </p>
              )}
            </section>

            <section className="sv-card" aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="text-base font-semibold text-slate-900">
                Metrics
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <MetricCard
                  label="Overall Score"
                  value={report ? `${report.riskScore}/100` : null}
                  note={report ? 'Backend risk score' : undefined}
                />
                <MetricCard label="k-Anonymity" value={null} note="Not returned by this backend" />
                <MetricCard label="l-Diversity" value={null} note="Not returned by this backend" />
                <MetricCard
                  label="Re-identification Risk"
                  value={null}
                  note="Not returned by this backend"
                />
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Metrics without backend values are shown as unavailable - the frontend never
                calculates privacy figures.
              </p>
            </section>
          </div>

          {/* ---- Details + recommendations + column risk ---- */}
          <div className="space-y-6">
            <section className="sv-card" aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-base font-semibold text-slate-900">
                Details
              </h2>
              {report?.details ? (
                <p className="mt-2 break-words text-sm text-slate-600">{report.details}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No details were returned by the backend for this dataset.
                </p>
              )}
            </section>

            <section className="sv-card" aria-labelledby="recommendations-heading">
              <h2 id="recommendations-heading" className="text-base font-semibold text-slate-900">
                Recommendations
              </h2>
              <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No recommendations were returned by the backend for this dataset.
              </p>
            </section>

            <section className="sv-card" aria-labelledby="column-risk-heading">
              <h2 id="column-risk-heading" className="text-base font-semibold text-slate-900">
                Column Risk Analysis
              </h2>

              {columns.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                  Column-level risk details are not available for this dataset.
                </p>
              ) : (
                <>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <caption className="sr-only">Column types and detected personal data</caption>
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
                        {columns.map((column) => {
                          const hasPii = column.piiType && column.piiType !== 'NONE';
                          return (
                            <tr key={column.name} className={hasPii ? 'bg-amber-50/60' : undefined}>
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
                  <p className="mt-2 text-xs text-slate-500">
                    {formatNumber(report?.piiColumnCount ?? 0)} column
                    {(report?.piiColumnCount ?? 0) === 1 ? '' : 's'} flagged as carrying personal
                    data. Per-column risk, confidence and recommendation fields are not returned
                    by this backend.
                  </p>
                </>
              )}
            </section>

            <section className="sv-card" aria-labelledby="next-step-heading">
              <h2 id="next-step-heading" className="text-base font-semibold text-slate-900">
                Next step
              </h2>
              <RouteLink
                to={`/datasets/${datasetId}/generate`}
                className="sv-btn sv-btn-primary mt-3 w-full sm:w-auto"
              >
                Generate Synthetic Data
              </RouteLink>
            </section>
          </div>

        </div>
      )}
    </AppLayout>
  );
}



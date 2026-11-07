import { useCallback, useEffect, useState } from 'react';

import Alert from '../components/Alert';
import AppLayout from '../components/AppLayout';
import LineChart from '../components/LineChart';
import RouteLink from '../components/RouteLink';
import { SkeletonBlock } from '../components/PageSkeleton';
import { useAuth } from '../context/AuthContext';
import * as dashboardService from '../services/dashboard';
import { toApiError } from '../utils/errors';
import { formatDateTime, formatDayLabel, formatNumber, toDate } from '../utils/format';

/**
 * Dashboard (protected route "/dashboard").
 *
 * This backend build has no dashboard endpoint, so every figure here is derived
 * from real endpoints (see src/services/dashboard.js): GET /api/projects,
 * GET /api/projects/{id}/datasets and GET /api/datasets/{id}/analysis.
 *
 * Error isolation: statistics, recent activity and the privacy overview load
 * independently - one failing section never blanks the page.
 */

const RISK_BADGE_CLASSES = {
  LOW: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  MEDIUM: 'border-amber-300 bg-amber-50 text-amber-900',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-900',
  CRITICAL: 'border-red-300 bg-red-50 text-red-800',
};

const RISK_BAR_CLASSES = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

function badgeClass(level) {
  const key = String(level || '').toUpperCase();
  return RISK_BADGE_CLASSES[key] ?? 'border-slate-300 bg-slate-50 text-slate-700';
}

function barClass(level) {
  const key = String(level || '').toUpperCase();
  return RISK_BAR_CLASSES[key] ?? 'bg-slate-400';
}

/** Cumulative dataset count per day, computed only from real uploadedAt values. */
function buildGrowthPoints(datasets) {
  const byDay = new Map();
  (Array.isArray(datasets) ? datasets : []).forEach((dataset) => {
    const date = toDate(dataset?.uploadedAt);
    if (!date) {
      return;
    }
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    byDay.set(key, (byDay.get(key) || 0) + 1);
  });

  let running = 0;
  return [...byDay.keys()]
    .sort()
    .map((key) => {
      running += byDay.get(key);
      return { label: formatDayLabel(key), value: running };
    });
}

function KpiCard({ label, supporting, state, value, error, onRetry }) {
  return (
    <div className="sv-card flex flex-col justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {state === 'loading' ? (
          <SkeletonBlock className="mt-3 h-9 w-24" />
        ) : state === 'error' ? (
          <p className="mt-3 text-sm font-medium text-red-700">{error?.title || 'Unable to load.'}</p>
        ) : (
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        )}
      </div>
      <div className="mt-3">
        {state === 'error' && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="sv-btn sv-btn-secondary !px-3 !py-1.5 !text-xs"
          >
            Retry
          </button>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">{supporting}</p>
      </div>
    </div>
  );
}

function ActivityRow({ activity }) {
  const isProject = activity.type === 'PROJECT_CREATED';
  const initial = isProject ? 'P' : 'D';

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg text-xs font-bold ${
          isProject ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-700'
        }`}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{activity.title}</p>
        <p className="truncate text-xs text-slate-600">{activity.detail}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDateTime(activity.at) || 'Unknown date'}
          {activity.status ? ` · ${String(activity.status).toLowerCase()}` : ''}
        </p>
      </div>
      {isProject && activity.projectId ? (
        <RouteLink
          to={`/projects/${activity.projectId}/datasets/new`}
          className="sv-btn sv-btn-secondary mt-1 !px-3 !py-1.5 !text-xs"
        >
          Open project
        </RouteLink>
      ) : null}
      {!isProject && activity.datasetId ? (
        <RouteLink
          to={`/datasets/${activity.datasetId}/privacy`}
          className="sv-btn sv-btn-secondary mt-1 !px-3 !py-1.5 !text-xs"
        >
          View privacy
        </RouteLink>
      ) : null}
    </li>
  );
}

function RiskDistribution({ distribution }) {
  const entries = Object.entries(distribution || {});
  const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);

  if (total === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {entries.map(([level, count]) => {
        const value = Number(count || 0);
        const percent = Math.round((value / total) * 100);
        return (
          <li key={level}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(level)}`}>
                {level}
              </span>
              <span className="text-slate-700">
                {formatNumber(value)} dataset{value === 1 ? '' : 's'} · {percent}%
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-100"
              role="presentation"
            >
              <div
                className={`h-full rounded ${barClass(level)}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ status: 'loading', data: null, error: null });
  const [activity, setActivity] = useState({ status: 'loading', data: null, error: null });
  const [privacy, setPrivacy] = useState({ status: 'loading', data: null, error: null });

  const loadStats = useCallback(async () => {
    setStats({ status: 'loading', data: null, error: null });
    try {
      const data = await dashboardService.getDashboardStats();
      setStats({ status: 'ready', data, error: null });
    } catch (error) {
      setStats({ status: 'error', data: null, error: toApiError(error) });
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivity({ status: 'loading', data: null, error: null });
    try {
      const data = await dashboardService.getRecentActivity({ limit: 12 });
      setActivity({ status: 'ready', data, error: null });
    } catch (error) {
      setActivity({ status: 'error', data: null, error: toApiError(error) });
    }
  }, []);

  const loadPrivacy = useCallback(async () => {
    setPrivacy({ status: 'loading', data: null, error: null });
    try {
      const data = await dashboardService.getPrivacyOverview();
      setPrivacy({ status: 'ready', data, error: null });
    } catch (error) {
      setPrivacy({ status: 'error', data: null, error: toApiError(error) });
    }
  }, []);

  /* The three sections load and fail independently. */
  useEffect(() => {
    loadStats();
    loadActivity();
    loadPrivacy();
  }, [loadStats, loadActivity, loadPrivacy]);

  const firstName = (user?.fullName || '').trim().split(' ')[0];
  const firstProjectId = stats.data?.projects?.find((project) => project?.id)?.id ?? null;
  const rowsIngested = (activity.data?.datasets || []).reduce(
    (sum, dataset) => sum + (Number(dataset?.rowCount) || 0),
    0,
  );
  const growthPoints = buildGrowthPoints(activity.data?.datasets);
  const privacyData = privacy.data;
  const distributionTotal = privacyData
    ? Object.values(privacyData.distribution || {}).reduce((sum, count) => sum + Number(count || 0), 0)
    : 0;

  const uploadTarget = firstProjectId ? `/projects/${firstProjectId}/datasets/new` : '/projects';

  return (
    <AppLayout
      title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
      description="Monitor your SynthVault workspace."
      actions={
        <RouteLink to={uploadTarget} className="sv-btn sv-btn-primary">
          Upload dataset
        </RouteLink>
      }
    >
      <div className="space-y-6">
        {/* ---- KPI grid ---- */}
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">Key figures</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Projects"
              state={stats.status}
              value={formatNumber(stats.data?.projectCount ?? 0)}
              supporting={
                stats.status === 'ready' && stats.data?.projectCount === 0
                  ? 'Create your first project to get started.'
                  : 'Workspaces you own.'
              }
              error={stats.error}
              onRetry={loadStats}
            />
            <KpiCard
              label="Datasets"
              state={stats.status}
              value={formatNumber(stats.data?.datasetCount ?? 0)}
              supporting={
                stats.status === 'ready' && stats.data?.datasetCount === 0
                  ? 'Upload your first dataset.'
                  : 'CSV files analyzed across all projects.'
              }
              error={stats.error}
              onRetry={loadStats}
            />
            <KpiCard
              label="Rows ingested"
              state={activity.status}
              value={formatNumber(rowsIngested)}
              supporting="Total data rows across uploaded datasets."
              error={activity.error}
              onRetry={loadActivity}
            />
            <KpiCard
              label="Avg privacy risk score"
              state={privacy.status}
              value={
                privacy.status === 'ready'
                  ? privacyData?.avgRiskScore !== null && privacyData?.avgRiskScore !== undefined
                    ? `${privacyData.avgRiskScore}/100`
                    : 'Not scored yet'
                  : undefined
              }
              supporting="Lower is safer. From dataset privacy reports."
              error={privacy.error}
              onRetry={loadPrivacy}
            />
          </div>
          {stats.status === 'error' ? (
            <Alert
              tone="error"
              title="Unable to load dashboard statistics."
              message={stats.error?.message}
              onRetry={loadStats}
              className="mt-3"
            />
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---- Recent activity ---- */}
          <section className="sv-card" aria-labelledby="activity-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="activity-heading" className="text-base font-semibold text-slate-900">
                Recent Activity
              </h2>
              <RouteLink to="/projects" className="sv-link text-sm">
                View projects
              </RouteLink>
            </div>

            {activity.status === 'loading' ? (
              <div className="mt-4 space-y-3" aria-live="polite" aria-label="Loading recent activity">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-3 py-2">
                    <SkeletonBlock className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-3 w-1/2" />
                      <SkeletonBlock className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.status === 'error' ? (
              <Alert
                tone="error"
                title="Unable to load recent activity."
                message={activity.error?.message}
                onRetry={loadActivity}
                className="mt-4"
              />
            ) : (activity.data?.activities || []).length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                <p className="text-sm font-medium text-slate-900">Nothing has happened yet.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a dataset or create a generation job to see activity here.
                </p>
                <RouteLink to="/projects" className="sv-btn sv-btn-primary mt-4">
                  Create your first project
                </RouteLink>
              </div>
            ) : (
              <>
                {activity.data?.partial ? (
                  <Alert
                    tone="warning"
                    title="Some activity could not be loaded."
                    message="One or more project dataset lists were unavailable, so this feed may be incomplete."
                    className="mt-4"
                  />
                ) : null}
                <ul className="mt-2 divide-y divide-slate-100">
                  {activity.data.activities.map((item, index) => (
                    <ActivityRow
                      key={`${item.type}-${item.projectId ?? ''}-${item.datasetId ?? ''}-${index}`}
                      activity={item}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* ---- Growth + privacy overview ---- */}
          <div className="space-y-6">
            <section className="sv-card" aria-labelledby="growth-heading">
              <h2 id="growth-heading" className="text-base font-semibold text-slate-900">
                Dataset Growth
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cumulative datasets over time, from real upload records.
              </p>
              {activity.status === 'loading' ? (
                <SkeletonBlock className="mt-4 h-[200px] w-full" />
              ) : activity.status === 'error' ? (
                <Alert
                  tone="error"
                  title="Unable to load analytics."
                  message={activity.error?.message}
                  onRetry={loadActivity}
                  className="mt-4"
                />
              ) : growthPoints.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                  Not enough activity to display analytics yet. Upload a dataset to start the growth chart.
                </p>
              ) : (
                <div className="mt-4">
                  <LineChart points={growthPoints} ariaLabel="Cumulative dataset count over time" />
                </div>
              )}
            </section>

            <section className="sv-card" aria-labelledby="privacy-overview-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="privacy-overview-heading" className="text-base font-semibold text-slate-900">
                  Privacy Risk Overview
                </h2>
                <RouteLink to="/projects" className="sv-link text-sm">
                  Open datasets
                </RouteLink>
              </div>

              {privacy.status === 'loading' ? (
                <div className="mt-4 space-y-3">
                  {[0, 1, 2].map((index) => (
                    <SkeletonBlock key={index} className="h-6 w-full" />
                  ))}
                </div>
              ) : privacy.status === 'error' ? (
                <Alert
                  tone="error"
                  title="Unable to load analytics."
                  message={privacy.error?.message}
                  onRetry={loadPrivacy}
                  className="mt-4"
                />
              ) : privacyData?.partial ? (
                <Alert
                  tone="warning"
                  title="Some datasets could not be analyzed."
                  message="A few dataset analyses were unavailable, so this overview may be incomplete."
                  className="mt-4"
                />
              ) : distributionTotal === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                  No scored datasets yet. Upload a dataset to see its privacy risk here.
                </p>
              ) : (
                <div className="mt-4">
                  <RiskDistribution distribution={privacyData.distribution} />
                  <p className="mt-3 text-xs text-slate-500">
                    {formatNumber(privacyData.piiDatasetCount)} of {formatNumber(privacyData.analyzedCount)} analyzed
                    dataset{privacyData.analyzedCount === 1 ? '' : 's'} contain detected personal data columns.
                  </p>
                </div>
              )}
            </section>
          </div>

        </div>

        {/* ---- Quick actions ---- */}
        <section className="sv-card" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-base font-semibold text-slate-900">
            Quick actions
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <RouteLink to="/projects" className="sv-btn sv-btn-primary w-full sm:w-auto">
              Create Project
            </RouteLink>
            <RouteLink to={uploadTarget} className="sv-btn sv-btn-secondary w-full sm:w-auto">
              Upload Dataset
            </RouteLink>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}



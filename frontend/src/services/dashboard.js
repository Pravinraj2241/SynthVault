import api from './api';

/**
 * Dashboard service.
 *
 * Verified against the backend source (synthvault-mca): that build exposes NO
 * /api/dashboard/* controller, so every figure on the dashboard is derived from
 * endpoints that actually exist:
 *
 *   GET /api/projects                 -> ProjectResponse[]  (id, name, description,
 *                                        createdAt, datasetCount)
 *   GET /api/projects/{id}/datasets   -> DatasetSummaryResponse[] (id, originalName,
 *                                        rowCount, columnCount, status, uploadedAt)
 *   GET /api/datasets/{id}/analysis   -> DatasetAnalysisResponse (includes
 *                                        privacyReport { riskScore, riskLevel,
 *                                        piiColumnCount, details })
 *
 * Nothing is invented. Series the backend does not provide (per-day generation
 * volume, hour-of-day heatmaps) are simply not shown. If the backend ships a
 * real dashboard API later, only this module needs to change.
 *
 * Per-project / per-dataset calls use Promise.allSettled so one failing request
 * degrades its slice ("partial") without destroying the whole page.
 */

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

async function listProjects() {
  const { data } = await api.get('/api/projects');
  return Array.isArray(data) ? data : [];
}

function datasetPath(datasetId) {
  return `/api/datasets/${encodeURIComponent(String(datasetId))}/analysis`;
}

function projectDatasetsPath(projectId) {
  return `/api/projects/${encodeURIComponent(String(projectId))}/datasets`;
}

function timestampOf(value) {
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

/**
 * Headline counters - one request. ProjectResponse already carries
 * datasetCount, so project + dataset totals need no extra calls.
 *
 * @returns {{ projects: Array, projectCount: number, datasetCount: number }}
 */
export async function getDashboardStats() {
  const projects = await listProjects();
  const datasetCount = projects.reduce(
    (sum, project) => sum + (Number(project?.datasetCount) || 0),
    0,
  );
  return { projects, projectCount: projects.length, datasetCount };
}

/**
 * Merged activity feed built only from real backend timestamps: project
 * creation (ProjectResponse.createdAt) and dataset uploads
 * (DatasetSummaryResponse.uploadedAt). One failing per-project dataset list
 * marks the result "partial" instead of failing the whole feed.
 */
export async function getRecentActivity({ limit = 12 } = {}) {
  const projects = await listProjects();

  const settled = await Promise.allSettled(
    projects.map((project) => api.get(projectDatasetsPath(project.id))),
  );

  const datasets = [];
  let partial = false;
  settled.forEach((result, index) => {
    const project = projects[index];
    if (result.status === 'fulfilled' && Array.isArray(result.value?.data)) {
      result.value.data.forEach((dataset) => {
        datasets.push({ ...dataset, projectId: project.id, projectName: project.name });
      });
    } else {
      partial = true;
    }
  });

  const activities = [
    ...projects
      .filter((project) => project?.createdAt)
      .map((project) => ({
        type: 'PROJECT_CREATED',
        at: project.createdAt,
        title: project.name || 'Untitled project',
        detail: 'Project created',
        projectId: project.id,
      })),
    ...datasets
      .filter((dataset) => dataset?.uploadedAt)
      .map((dataset) => ({
        type: 'DATASET_UPLOADED',
        at: dataset.uploadedAt,
        title: dataset.originalName || 'Dataset',
        detail: dataset.projectName ? `Uploaded to ${dataset.projectName}` : 'Dataset uploaded',
        datasetId: dataset.id,
        projectId: dataset.projectId,
        status: dataset.status,
      })),
  ].sort((a, b) => timestampOf(b.at) - timestampOf(a.at));

  return {
    activities: typeof limit === 'number' && limit > 0 ? activities.slice(0, limit) : activities,
    datasets,
    projects,
    partial,
  };
}

/**
 * Privacy risk overview derived from the real per-dataset analysis endpoint.
 * Analyses that fail are skipped (reported through `partial`) so a single
 * broken dataset never erases the overview.
 */
export async function getPrivacyOverview() {
  const projects = await listProjects();

  const settledLists = await Promise.allSettled(
    projects.map((project) => api.get(projectDatasetsPath(project.id))),
  );

  const datasets = [];
  let listPartial = false;
  settledLists.forEach((result, index) => {
    const project = projects[index];
    if (result.status === 'fulfilled' && Array.isArray(result.value?.data)) {
      result.value.data.forEach((dataset) => {
        datasets.push({ ...dataset, projectId: project.id, projectName: project.name });
      });
    } else {
      listPartial = true;
    }
  });

  const settledAnalyses = await Promise.allSettled(
    datasets.map((dataset) => api.get(datasetPath(dataset.id))),
  );

  const analyses = [];
  let analysisPartial = false;
  settledAnalyses.forEach((result, index) => {
    const dataset = datasets[index];
    if (result.status === 'fulfilled') {
      const analysis = result.value?.data;
      const report = analysis?.privacyReport ?? null;
      analyses.push({
        datasetId: analysis?.id ?? dataset.id,
        name: analysis?.originalName ?? dataset.originalName,
        projectId: dataset.projectId,
        projectName: dataset.projectName,
        rowCount: analysis?.rowCount ?? dataset.rowCount,
        columnCount: analysis?.columnCount ?? dataset.columnCount,
        status: analysis?.status ?? dataset.status,
        riskScore: report ? report.riskScore : null,
        riskLevel: report ? report.riskLevel : null,
        piiColumnCount: report ? report.piiColumnCount : null,
      });
    } else {
      analysisPartial = true;
    }
  });

  const scored = analyses.filter((analysis) => analysis.riskScore !== null && analysis.riskScore !== undefined);
  const avgRiskScore = scored.length
    ? Math.round(scored.reduce((sum, analysis) => sum + Number(analysis.riskScore), 0) / scored.length)
    : null;

  const distribution = {};
  RISK_LEVELS.forEach((level) => {
    distribution[level] = 0;
  });
  analyses.forEach((analysis) => {
    const level = String(analysis.riskLevel || '').toUpperCase();
    if (Object.prototype.hasOwnProperty.call(distribution, level)) {
      distribution[level] += 1;
    }
  });

  const piiDatasetCount = analyses.filter(
    (analysis) => Number(analysis.piiColumnCount) > 0,
  ).length;

  return {
    analyses,
    analyzedCount: analyses.length,
    datasetTotal: datasets.length,
    avgRiskScore,
    distribution,
    piiDatasetCount,
    partial: listPartial || analysisPartial,
  };
}



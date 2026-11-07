import api from './api';

/**
 * Project workspace service.
 *
 * Verified against ProjectController:
 *   POST   /api/projects        -> 201 ProjectResponse
 *   GET    /api/projects        -> ProjectResponse[]
 *   GET    /api/projects/{id}   -> ProjectResponse
 *   PUT    /api/projects/{id}   -> ProjectResponse
 *   DELETE /api/projects/{id}   -> 204
 *
 * ProjectResponse = { id, name, description, createdAt, datasetCount }
 */

function projectPath(projectId) {
  return `/api/projects/${encodeURIComponent(String(projectId))}`;
}

/** @returns {Promise<Array<{id: number, name: string, description: string, createdAt: string, datasetCount: number}>>} */
export async function listProjects() {
  const { data } = await api.get('/api/projects');
  return Array.isArray(data) ? data : [];
}

export async function getProject(projectId) {
  const { data } = await api.get(projectPath(projectId));
  return data;
}

/** @param {{ name: string, description?: string }} payload */
export async function createProject({ name, description = '' }) {
  const { data } = await api.post('/api/projects', { name, description });
  return data;
}

/** @param {{ name: string, description?: string }} payload */
export async function updateProject(projectId, { name, description = '' }) {
  const { data } = await api.put(projectPath(projectId), { name, description });
  return data;
}

export async function deleteProject(projectId) {
  await api.delete(projectPath(projectId));
}

/** ADMIN-only: GET /api/admin/users -> UserResponse[] */
export async function listAllUsers() {
  const { data } = await api.get('/api/admin/users');
  return Array.isArray(data) ? data : [];
}
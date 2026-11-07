import { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '../components/Alert';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import RouteLink from '../components/RouteLink';
import { SkeletonBlock } from '../components/PageSkeleton';
import * as projectsService from '../services/projects';
import { toApiError } from '../utils/errors';
import { formatDate } from '../utils/format';

/**
 * Projects (protected route "/projects").
 *
 * Real CRUD against the verified backend contract:
 *   GET/POST /api/projects, GET/PUT/DELETE /api/projects/{id}
 * ProjectRequest  = { name (required, <=100), description (optional) }
 * ProjectResponse = { id, name, description, createdAt, datasetCount }
 *
 * A failed delete keeps the rest of the list usable (error isolation), create/
 * edit errors are shown inside their modal, and the list is filtered
 * client-side only (the backend exposes no search endpoint).
 */

const EMPTY_FORM = { name: '', description: '' };

function ProjectForm({ form, fieldErrors, apiError, isWorking, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {apiError ? (
        <Alert tone="error" title={apiError.title} message={apiError.message} className="mb-4" />
      ) : null}

      <div>
        <label htmlFor="project-name" className="sv-label">
          Name <span aria-hidden="true" className="text-red-600">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          value={form.name}
          onChange={onChange('name')}
          maxLength={100}
          required
          aria-required="true"
          aria-invalid={fieldErrors.name ? 'true' : undefined}
          aria-describedby={fieldErrors.name ? 'project-name-error' : undefined}
          disabled={isWorking}
          placeholder="e.g. Hospital discharge records"
          className="sv-input"
        />
        {fieldErrors.name ? (
          <p id="project-name-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.name}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">{form.name.length}/100 characters</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="project-description" className="sv-label">
          Description <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="project-description"
          value={form.description}
          onChange={onChange('description')}
          rows={3}
          disabled={isWorking}
          placeholder="What this project contains and who it is for."
          className="sv-input"
        />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isWorking}
          className="sv-btn sv-btn-secondary w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isWorking}
          aria-busy={isWorking || undefined}
          className="sv-btn sv-btn-primary w-full sm:w-auto"
        >
          {isWorking ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const [list, setList] = useState({ status: 'loading', projects: [], error: null });
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // null | {mode:'create'} | {mode:'edit',project} | {mode:'delete',project}
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null); // {project, error}
  const [pageNotice, setPageNotice] = useState(null); // {tone,title,message}

  const loadProjects = useCallback(async () => {
    setList({ status: 'loading', projects: [], error: null });
    try {
      const projects = await projectsService.listProjects();
      setList({ status: 'ready', projects, error: null });
    } catch (error) {
      setList({ status: 'error', projects: [], error: toApiError(error) });
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const changeField = (name) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (project) => {
    setForm({
      name: typeof project?.name === 'string' ? project.name : '',
      description: typeof project?.description === 'string' ? project.description : '',
    });
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'edit', project });
  };

  const openDelete = (project) => {
    setDeleteError(null);
    setModal({ mode: 'delete', project });
  };

  const closeModal = () => {
    if (!isSaving && !isDeleting) {
      setModal(null);
      setFormError(null);
    }
  };

  /** Client-side validation mirroring ProjectService.validatedName. */
  const validateForm = () => {
    const errors = {};
    const name = form.name.trim();
    if (!name) {
      errors.name = 'Project name is required';
    } else if (name.length > 100) {
      errors.name = 'Project name must be at most 100 characters';
    }
    return errors;
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (modal?.mode === 'edit' && modal.project) {
        await projectsService.updateProject(modal.project.id, payload);
        setPageNotice({ tone: 'success', title: 'Project updated', message: 'Your changes were saved.' });
      } else {
        await projectsService.createProject(payload);
        setPageNotice({ tone: 'success', title: 'Project created', message: `"${payload.name}" is ready.` });
      }
      setModal(null);
      await loadProjects();
    } catch (error) {
      const apiError = toApiError(error);
      setFormError({ title: apiError.title, message: apiError.message });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (project) => {
    if (!project) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await projectsService.deleteProject(project.id);
      setModal(null);
      setPageNotice({
        tone: 'success',
        title: 'Project deleted',
        message: `"${project.name}" and its datasets were removed.`,
      });
      await loadProjects();
    } catch (error) {
      /* Page-level error: the list itself stays usable. */
      setDeleteError({ project, error: toApiError(error) });
      setModal(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return list.projects;
    }
    return list.projects.filter((project) => {
      const name = String(project?.name || '').toLowerCase();
      const description = String(project?.description || '').toLowerCase();
      return name.includes(needle) || description.includes(needle);
    });
  }, [list.projects, query]);

  const hasProjects = list.projects.length > 0;

  return (
    <AppLayout
      title="Projects"
      description="Organize datasets and synthetic-data workflows by project."
      actions={
        <button type="button" onClick={openCreate} className="sv-btn sv-btn-primary">
          + New Project
        </button>
      }
    >
      <div className="space-y-4">
        {pageNotice ? (
          <Alert
            tone={pageNotice.tone}
            title={pageNotice.title}
            message={pageNotice.message}
            onDismiss={() => setPageNotice(null)}
          />
        ) : null}

        {deleteError ? (
          <Alert
            tone="error"
            title={
              deleteError.error?.status === 404
                ? 'Project not found'
                : deleteError.error?.status === 403
                  ? 'You do not have permission to modify this project.'
                  : 'Unable to delete project.'
            }
            message={deleteError.error?.message}
            onRetry={() => {
              const target = deleteError.project;
              setDeleteError(null);
              if (target) {
                confirmDelete(target);
              }
            }}
            onDismiss={() => setDeleteError(null)}
          />
        ) : null}

        {list.status === 'loading' ? (
          <div className="sv-card space-y-4" aria-live="polite" aria-label="Loading projects">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-1/3" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
                <SkeletonBlock className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : list.status === 'error' ? (
          <Alert
            tone="error"
            title="Unable to load projects."
            message={list.error?.message}
            onRetry={loadProjects}
          />
        ) : !hasProjects ? (
          <div className="sv-card mx-auto max-w-xl text-center">
            <h2 className="text-lg font-semibold text-slate-900">No projects yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create a project to start uploading and analyzing datasets.
            </p>
            <button type="button" onClick={openCreate} className="sv-btn sv-btn-primary mt-5">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-sm text-slate-600">
                {filteredProjects.length} of {list.projects.length} project
                {list.projects.length === 1 ? '' : 's'}
              </p>
              <div>
                <label htmlFor="project-search" className="sr-only">
                  Filter projects by name or description
                </label>
                <input
                  id="project-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter projects..."
                  className="sv-input sm:w-64"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                No projects match your filter. Clear the search box to see all projects.
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="sv-card overflow-x-auto p-0">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <caption className="sr-only">Your projects</caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th scope="col" className="px-4 py-3 font-semibold">Project</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Datasets</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Created</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {project.name}
                          </td>
                          <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                            {project.description || <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{project.datasetCount}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(project.createdAt) || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <RouteLink
                                to={`/projects/${project.id}/datasets/new`}
                                className="sv-btn sv-btn-secondary !px-3 !py-1.5 !text-xs"
                              >
                                Open
                              </RouteLink>
                              <button
                                type="button"
                                onClick={() => openEdit(project)}
                                className="sv-btn sv-btn-secondary !px-3 !py-1.5 !text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(project)}
                                className="sv-btn sv-btn-secondary !border-red-200 !text-red-700 hover:!bg-red-50 !px-3 !py-1.5 !text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="space-y-3 md:hidden">
                  {filteredProjects.map((project) => (
                    <li key={project.id} className="sv-card">
                      <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
                      {project.description ? (
                        <p className="mt-1 text-sm text-slate-600">{project.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {project.datasetCount} dataset{project.datasetCount === 1 ? '' : 's'}
                        {formatDate(project.createdAt)
                          ? ` · created ${formatDate(project.createdAt)}`
                          : ''}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <RouteLink
                          to={`/projects/${project.id}/datasets/new`}
                          className="sv-btn sv-btn-primary w-full !py-2 !text-xs sm:w-auto"
                        >
                          Open
                        </RouteLink>
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          className="sv-btn sv-btn-secondary w-full !py-2 !text-xs sm:w-auto"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(project)}
                          className="sv-btn sv-btn-secondary w-full !border-red-200 !py-2 !text-xs !text-red-700 hover:!bg-red-50 sm:w-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

              </>
            )}
          </div>
        )}

        {/* Create / edit modal */}
        <Modal
          open={modal?.mode === 'create' || modal?.mode === 'edit'}
          title={modal?.mode === 'edit' ? 'Edit project' : 'New project'}
          description={
            modal?.mode === 'edit'
              ? 'Update the name or description of this project.'
              : 'Projects group your datasets and synthetic-data workflows.'
          }
          onClose={closeModal}
        >
          <ProjectForm
            form={form}
            fieldErrors={fieldErrors}
            apiError={formError}
            isWorking={isSaving}
            onChange={changeField}
            onSubmit={submitForm}
            onCancel={closeModal}
            submitLabel={modal?.mode === 'edit' ? 'Save changes' : 'Create project'}
          />
        </Modal>

        {/* Delete confirmation modal */}
        <Modal
          open={modal?.mode === 'delete'}
          title="Delete project"
          description={
            modal?.project
              ? `Delete "${modal.project.name}"? All of its datasets, analyses and generated data will also be removed. This cannot be undone.`
              : undefined
          }
          onClose={closeModal}
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              disabled={isDeleting}
              className="sv-btn sv-btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(modal?.project)}
              disabled={isDeleting}
              aria-busy={isDeleting || undefined}
              className="sv-btn sv-btn-primary w-full !bg-red-700 hover:!bg-red-800 active:!bg-red-900 sm:w-auto"
            >
              {isDeleting ? 'Deleting...' : 'Delete project'}
            </button>
          </div>
        </Modal>

      </div>
    </AppLayout>
  );
}


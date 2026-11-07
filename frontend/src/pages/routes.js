/* Public pages */
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';

/* Protected pages */
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import DatasetUploadPage from '../pages/DatasetUploadPage';
import PrivacyPage from '../pages/PrivacyPage';
import GeneratePage from '../pages/GeneratePage';

/**
 * The single, centralized route table.
 *
 * `public: true` routes render for everyone; every other route is wrapped in
 * <RequireAuth>, which redirects to /login when there is no authenticated user.
 * The wildcard '*' entry must stay last.
 */
export const ROUTES = [
  { path: '/', public: true, component: LandingPage },
  { path: '/login', public: true, component: LoginPage },
  { path: '/dashboard', component: DashboardPage, title: 'Dashboard' },
  { path: '/projects', component: ProjectsPage, title: 'Projects' },
  {
    path: '/projects/:projectId/datasets/new',
    component: DatasetUploadPage,
    title: 'Upload dataset',
    mapParams: (params) => ({ projectId: params.projectId }),
  },
  {
    path: '/datasets/:datasetId/privacy',
    component: PrivacyPage,
    title: 'Privacy analysis',
    mapParams: (params) => ({ datasetId: params.datasetId }),
  },
  {
    path: '/datasets/:datasetId/generate',
    component: GeneratePage,
    title: 'Generate synthetic data',
    mapParams: (params) => ({ datasetId: params.datasetId }),
  },
  { path: '*', public: true, component: NotFoundPage, mapParams: () => ({}) },
];

export default ROUTES;
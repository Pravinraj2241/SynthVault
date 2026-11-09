# SynthVault Frontend Documentation

## Tech Stack
- React 18 + Vite 6 + Tailwind CSS 3.4 + Axios 1.8

## Folder Structure (src/)
- **src/components/**: Reusable UI components (Alert, Modal, PageSkeleton, etc.)
- **src/pages/**: Page components (Landing, Login, Dashboard, Projects, Dataset Upload, Generate, Privacy, NotFound)
- **src/context/**: State management (AuthContext, ApiContext)
- **src/services/**: API service files (api.js, auth.js, dashboard.js, datasets.js, generation.js, projects.js, reports.js)
- **src/utils/**: Utility functions (authStorage.js, errors.js, format.js, routeMatch.js)
- **src/styles/**: Global CSS (main.css)

## State Management
- **AuthContext.jsx**: User authentication state (login, logout, token storage)
- **ApiContext.jsx**: API base URL configuration and axios instance setup

## Page Routes
| Route | Component | Purpose |
|-------|------------|---------|
| `/` | LandingPage.jsx | Brand landing page |
| `/login` | LoginPage.jsx | User login |
| `/dashboard` | DashboardPage.jsx | Main workspace |
| `/projects` | ProjectsPage.jsx | Project list |
| `/projects/:id` | DatasetUploadPage.jsx | Dataset upload |
| `/projects/:id/generate` | GeneratePage.jsx | Synthetic data generation |
| `/privacy` | PrivacyPage.jsx | Privacy analysis |
| `*` | NotFoundPage.jsx | 404 page |

## Build & Run Commands
```powershell
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
```

## Key Files
- `frontend/src/main.jsx` - React entry point (ReactDOM.createRoot)
- `frontend/src/App.jsx` - Router and providers
- `frontend/src/components/AppLayout.jsx` - Layout wrapper
- `frontend/src/services/api.js` - Axios instance with auth interceptor
- `frontend/src/context/AuthContext.jsx` - JWT token management
- `frontend/src/context/ApiContext.jsx` - API endpoint configuration
- `frontend/src/components/RequireAuth.jsx` - Protected route guard
- `frontend/src/context/AuthContext.jsx` - Session management

## Dependencies
- **Runtime**: react, react-dom, axios
- **Dev**: @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, vite

## Scripts
- `npm run dev` - Start dev server (http://localhost:5173)
- `npm run build` - Production build to dist/
- `npm run preview` - Preview production build
- `npm run test` - Run smoke tests

## Key Files
- `frontend/src/main.jsx` - React entry point (ReactDOM.createRoot)
- `frontend/src/App.jsx` - Router and providers
- `frontend/src/components/AppLayout.jsx` - Layout wrapper
- `frontend/src/services/api.js` - Axios instance with auth interceptor
- `frontend/src/context/AuthContext.jsx` - JWT token management
- `frontend/src/context/ApiContext.jsx` - API endpoint configuration
- `frontend/src/components/RequireAuth.jsx` - Protected route guard
- `frontend/src/context/AuthContext.jsx` - Session management

## Dependencies
- **Runtime**: react, react-dom, axios
- **Dev**: @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, vite

## Scripts
- `npm run dev` - Start dev server (http://localhost:5173)
- `npm run build` - Production build to dist/
- `npm run preview` - Preview production build
- `npm run test` - Run smoke tests
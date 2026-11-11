# SynthVault Screenshots

This folder contains screenshots of the SynthVault application for documentation and README demonstration purposes.

## Required Screenshots

Capture and place the following screenshots in this folder. **Do not create dummy images** — all screenshots must be from a live running instance of the application.

| # | File Name | Page / Component | Description |
|---|-----------|------------------|-------------|
| 1 | `landing-page.png` | Landing Page | Homepage with hero section and feature overview |
| 2 | `login-page.png` | Login Page | Sign-in form with email and password fields |
| 3 | `dashboard-page.png` | Dashboard | Main workspace with project list and quick stats |
| 4 | `projects-page.png` | Projects Page | Project management interface |
| 5 | `dataset-upload-page.png` | Dataset Upload | CSV file upload with schema detection preview |
| 6 | `generate-page.png` | Generate Page | Synthetic data generation configuration |
| 7 | `privacy-report.png` | Privacy Analysis | Privacy risk scoring and PII detection report |

## How to Capture

1. Start the SynthVault backend (`mvn spring-boot:run` in `synthvault/`)
2. Start the frontend (`npm run dev` in `frontend/`)
3. Open `http://localhost:5173` in your browser
4. Navigate to each page listed above
5. Take a screenshot (PNG format, 1920×1080 recommended)
6. Save each screenshot with the exact filename listed above into this folder

## Notes

- **Do not create dummy images** — screenshots must be from the running application
- Ensure no sensitive data (real emails, phone numbers, Aadhaar, PAN, etc.) is visible in screenshots
- If using sample data, use only the provided `sample-dataset-100.csv`
- All screenshots should show the light theme unless dark mode is demonstrated

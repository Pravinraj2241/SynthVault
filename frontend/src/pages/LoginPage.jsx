import { useEffect, useRef, useState } from 'react';

import Alert from '../components/Alert';
import RouteLink from '../components/RouteLink';
import { useAuth } from '../context/AuthContext';
import { toApiError } from '../utils/errors';
import { navigate } from '../utils/router';

/**
 * Sign-in page (public route "/login").
 *
 * Verifies credentials with POST /api/auth/login, stores the session in
 * sessionStorage through AuthContext and then routes to /dashboard with the
 * native History API (no full page reload).
 *
 * Backend contract (verified against AuthService.java):
 *   POST /api/auth/login  ->  AuthResponse { token, tokenType, user }
 *   Invalid credentials   ->  AppException(401, "Invalid email or password")
 *
 * Tokens are never logged or rendered.
 */

const EMPTY_FORM = { email: '', password: '' };

/** Maps HTTP status codes and backend messages to user-friendly errors. */
function classifyLoginError(apiError) {
  if (!apiError) return null;

  const status = apiError.status;
  const msg = (apiError.message || '').toLowerCase();

  if (status === 401 || msg.includes('invalid email or password') || msg.includes('invalid credentials')) {
    return {
      title: 'Invalid credentials',
      message: 'The email or password you entered is incorrect. Please try again.',
      retryable: false,
    };
  }

  if (status === 403 || msg.includes('verify') || msg.includes('email not verified')) {
    return {
      title: 'Email not verified',
      message: 'Please verify your email before signing in.',
      retryable: false,
    };
  }

  if (status === 429 || msg.includes('too many')) {
    return {
      title: 'Too many attempts',
      message: 'Too many attempts. Please wait and try again.',
      retryable: false,
    };
  }

  if (apiError.kind === 'network') {
    return {
      title: 'Server unavailable',
      message:
        'Unable to connect to SynthVault. Check that the backend is running and try again.',
      retryable: true,
    };
  }

  if (apiError.kind === 'server') {
    return {
      title: 'Unexpected server error',
      message: 'The SynthVault server encountered a problem. Please try again in a moment.',
      retryable: true,
    };
  }

  return {
    title: apiError.title || 'Something went wrong',
    message: apiError.message || 'An unexpected problem occurred. Please try again.',
    retryable: apiError.retryable ?? false,
  };
}

export default function LoginPage() {
  const { login, isAuthenticated, isWorking, error: authError, clearError } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const emailRef = useRef(null);

  /* Auto-focus the email field on first render. */
  useEffect(() => {
    if (emailRef.current && !isAuthenticated) {
      emailRef.current.focus();
    }
  }, [isAuthenticated]);

  /* Already signed in? Go straight to the dashboard. */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated]);

  const updateField = (name) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError(null);
    clearError();
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) {
      next.email = 'Enter the email address you registered with.';
    }
    if (!form.password) {
      next.password = 'Enter your password.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }

    try {
      /* Trim email before submitting; do NOT trim password. */
      await login({ email: form.email.trim(), password: form.password });
      setForm(EMPTY_FORM);
    } catch (loginError) {
      const raw = toApiError(loginError);
      setFormError(classifyLoginError(raw));
    }
  };

  const handleRetry = () => {
    setFormError(null);
    clearError();
  };

  const displayError = formError ?? (authError ? classifyLoginError(authError) : null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* Desktop left zone - product message (hidden below lg) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:bg-brand-700 lg:px-16 lg:py-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white"
            >
              SV
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">SynthVault</span>
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-white">
            Privacy-preserving synthetic data, ready when you are.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brand-100">
            Sign in to access your workspace, manage projects, upload datasets, configure privacy
            guarantees, and generate high-fidelity synthetic data &mdash; all backed by the
            SynthVault engine.
          </p>
        </div>
      </div>

      {/* Right zone - login card */}
      <div className="flex flex-1 flex-col lg:w-1/2">
        <header className="border-b border-slate-200 bg-white">
          <div className="sv-shell flex items-center justify-between py-3">
            <RouteLink to="/" aria-label="SynthVault - home" className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
              >
                SV
              </span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">SynthVault</span>
            </RouteLink>
            <RouteLink to="/" className="sv-btn sv-btn-ghost">
              Back to home
            </RouteLink>
          </div>
        </header>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="w-full max-w-[calc(100%-32px)] sm:max-w-[440px]">
            <div className="sv-card">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Sign in to SynthVault
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Access your privacy-preserving synthetic data workspace.
              </p>

              {/* Error banner */}
              {displayError ? (
                <div role="alert" aria-live="polite" className="mt-5">
                  <Alert
                    tone="error"
                    title={displayError.title}
                    message={displayError.message}
                    onRetry={displayError.retryable ? handleRetry : undefined}
                    retryLabel="Try again"
                    onDismiss={() => {
                      setFormError(null);
                      clearError();
                    }}
                  />
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="sv-label">
                    Email
                  </label>
                  <input
                    ref={emailRef}
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isWorking}
                    value={form.email}
                    onChange={updateField('email')}
                    aria-invalid={fieldErrors.email ? 'true' : undefined}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                    className="sv-input"
                    placeholder="you@example.com"
                  />
                  {fieldErrors.email ? (
                    <p id="login-email-error" className="mt-1 text-xs text-red-700">
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="sv-label">
                      Password
                    </label>
                    {/* Forgot password - visually present but non-actionable until route exists */}
                    <span
                      className="text-xs text-slate-400 cursor-default"
                      aria-disabled="true"
                      title="Password recovery will be available in a future release."
                    >
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      disabled={isWorking}
                      value={form.password}
                      onChange={updateField('password')}
                      aria-invalid={fieldErrors.password ? 'true' : undefined}
                      aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                      className="sv-input pr-16"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <span className="flex items-center gap-1">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          Hide
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Show
                        </span>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p id="login-password-error" className="mt-1 text-xs text-red-700">
                      {fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isWorking}
                  aria-busy={isWorking || undefined}
                  className="sv-btn sv-btn-primary relative w-full"
                >
                  {isWorking ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </div>

            {/* Secondary actions */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <span
                className="font-medium text-slate-400 cursor-default"
                aria-disabled="true"
                title="Account registration will be available in a future release."
              >
                Create account
              </span>
            </p>

            <p className="mt-3 text-center text-sm text-slate-500">
              <RouteLink to="/" className="sv-link">
                Return to the SynthVault home page
              </RouteLink>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
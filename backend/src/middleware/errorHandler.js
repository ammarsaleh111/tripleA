// In production, never leak internal error details (SQL, stack traces, file
// paths, env vars) to clients. Client errors (4xx) keep their descriptive
// message; server errors (5xx) collapse to a safe generic message while the
// useful detail is logged server-side only.
const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (error, request, response, _next) => {
  const statusCode = error.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Log useful information server-side for all errors (never sent to client).
  if (statusCode >= 500) {
    const safeDetail = isProduction
      ? `Path: ${request.method} ${request.originalUrl}`
      : error?.stack || error?.message || String(error);
    // eslint-disable-next-line no-console
    console.error(`[${new Date().toISOString()}] ${statusCode} — ${safeDetail}`);
  }

  let message;
  if (isClientError || !isProduction) {
    message = error.message || 'Internal server error.';
  } else {
    message = 'Internal server error.';
  }

  response.status(statusCode).json({
    message,
    ...(isClientError && error.errors ? { errors: error.errors } : {}),
  });
};


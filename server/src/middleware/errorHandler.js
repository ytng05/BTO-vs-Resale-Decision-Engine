// Central error handler: consistent { error: { code, message } } shape for every failure.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.code === 'NOT_IMPLEMENTED' ? 501 : 500);
  if (status >= 500 && status !== 501) console.error(err);
  res.status(status).json({
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Something went wrong' },
  });
}

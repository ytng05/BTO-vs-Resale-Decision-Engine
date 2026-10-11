// SEAT 3. Routes that read or write Mongo answer 503 when there is no database, instead of hanging:
// Mongoose queues queries while disconnected and only fails them after 10 s.
import mongoose from 'mongoose';

export function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    error: { code: 'DB_UNAVAILABLE', message: 'The database is not connected. Set MONGODB_URI and restart the server.' },
  });
}

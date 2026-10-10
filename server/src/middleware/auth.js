// SEAT 3. JWT auth. jsonwebtoken (MIT).
// The client sends the token from /api/auth/login or /register as "Authorization: Bearer <token>".
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const TOKEN_TTL = '7d';

/** Signs a token for a user document. `sub` (subject) holds the user's id, the usual JWT convention. */
export function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

/** 401 unless the request carries a valid token; otherwise sets req.user = { id, email } and continues. */
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return unauthorized(res, 'Log in to continue.');

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    // Expired, tampered or signed with another secret: same answer for all of them.
    return unauthorized(res, 'Your session has expired. Log in again.');
  }
}

function unauthorized(res, message) {
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message } });
}


// token lasts 7 days, then user logs in again 
// algorithms: ['HS256'] prevents a forged token that claims to use a different signing method to get past the check
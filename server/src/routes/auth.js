// SEAT 3. Register, log in, and "who am I". bcryptjs (MIT) hashes passwords; jsonwebtoken (MIT) issues tokens.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

const BCRYPT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
// bcrypt only reads the first 72 bytes, so longer passwords are rejected instead of being silently cut.
const PASSWORD_MAX_BYTES = 72;
// Compared against when the email is unknown, so a wrong email takes as long as a wrong password
// (otherwise response time would reveal which emails have accounts).
const DUMMY_HASH = bcrypt.hashSync('no-such-user', BCRYPT_ROUNDS);

const publicUser = (user) => ({ id: String(user._id), email: user.email });

function validationError(res, message) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

// Runs before requireDb, so bad input gets a 400 even without a database.
function validateCredentials(req, res, next) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!EMAIL_RE.test(email)) return validationError(res, 'Enter a valid email address.');
  if (password.length < PASSWORD_MIN) return validationError(res, `Password must be at least ${PASSWORD_MIN} characters.`);
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return validationError(res, `Password must be at most ${PASSWORD_MAX_BYTES} characters.`);
  }
  req.credentials = { email, password };
  return next();
}

// POST /api/auth/register  { email, password } -> 201 { token, user: { id, email } }
router.post('/register', validateCredentials, requireDb, async (req, res, next) => {
  try {
    const { email, password } = req.credentials;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, passwordHash });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key on the unique email index in models/User.js
      return res.status(409).json({
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists. Log in instead.' },
      });
    }
    next(err);
  }
});

// POST /api/auth/login  { email, password } -> 200 { token, user: { id, email } }
router.post('/login', validateCredentials, requireDb, async (req, res, next) => {
  try {
    const { email, password } = req.credentials;
    const user = await User.findOne({ email });
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      // One message for both cases, so the response never confirms which emails are registered.
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me -> { user: { id, email } } for the token's owner. The client calls this on page load
// to restore a saved session.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

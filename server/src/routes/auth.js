// SEAT 3. bcryptjs for hashing, jsonwebtoken for tokens. See docs/API_CONTRACT.md.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();
router.post('/register', notImplemented('seat 3', 'Register'));
router.post('/login', notImplemented('seat 3', 'Login'));
export default router;

// SEAT 3 owns this. TODO: verify the JWT (Authorization: Bearer <token>), attach req.user, else 401.
// Until then it refuses, so unfinished routes are never accidentally open.
export function requireAuth(req, res) {
  return res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Auth middleware is not implemented yet', owner: 'seat 3' },
  });
}

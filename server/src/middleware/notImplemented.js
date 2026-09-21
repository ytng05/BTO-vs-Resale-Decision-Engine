// Placeholder handler so every route in docs/API_CONTRACT.md exists from day one.
// Replace with the real handler; keep the route path and response shape from the contract.
export function notImplemented(owner, feature) {
  return (req, res) =>
    res.status(501).json({
      error: { code: 'NOT_IMPLEMENTED', message: `${feature} is not implemented yet`, owner },
    });
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkSecrets } from '../src/config/env.js';

const strong = 'a'.repeat(64);

describe('checkSecrets', () => {
  afterEach(() => vi.restoreAllMocks());

  it('refuses to start in production without JWT_SECRET', () => {
    expect(() => checkSecrets({ nodeEnv: 'production', jwtSecret: 'dev-only-secret' })).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses a short secret in production', () => {
    expect(() => checkSecrets({ nodeEnv: 'production', jwtSecret: 'short' })).toThrow(/shorter than 32/);
  });

  it('accepts a long secret in production', () => {
    expect(() => checkSecrets({ nodeEnv: 'production', jwtSecret: strong })).not.toThrow();
  });

  it('only warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => checkSecrets({ nodeEnv: 'development', jwtSecret: 'dev-only-secret' })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET is not set'));
  });
});

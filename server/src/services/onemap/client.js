// SEAT 3. OneMap (free registration): geocode and distance for the PHG "near parents" test.
// The token expires and must be refreshed server-side. Credentials in .env, never in git.
import { NotImplementedError } from '../../engine/errors.js';

export async function distanceKm(fromAddress, toAddress) {
  throw new NotImplementedError('distanceKm', 'seat 3');
}

// Loads the versioned ruleset JSON. Rules live in config, never hard-coded in engine logic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RULESET_PATH = path.resolve(here, '../../config/rulesets/ruleset-2026-08-24.json');

/** @returns {{ ruleset: object, version: string, status: 'TEMPLATE'|'VERIFIED' }} */
export function loadRuleset(file = RULESET_PATH) {
  const ruleset = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!ruleset.version) throw new Error('Ruleset is missing a version');
  const status = String(ruleset.version).includes('template') ? 'TEMPLATE' : 'VERIFIED';
  return { ruleset, version: ruleset.version, status };
}

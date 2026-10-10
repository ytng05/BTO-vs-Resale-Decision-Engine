// SEAT 3. Turns raw HDB resale transactions (data.gov.sg) into the figures the app needs:
// median price, floor area and remaining lease per town + flat type. Pure functions: no I/O.
//
// Record fields as data.gov.sg returns them (all strings):
//   month "2026-08", town "TAMPINES", flat_type "4 ROOM", floor_area_sqm "93",
//   remaining_lease "61 years 04 months", resale_price "585000"

export function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

// "61 years 04 months" -> 61.33; "61 years" -> 61; anything else -> NaN
export function parseRemainingLease(text) {
  const match = /(\d+)\s*years?(?:\s+(\d+)\s*months?)?/i.exec(String(text ?? ''));
  if (!match) return NaN;
  return Number(match[1]) + (match[2] ? Number(match[2]) / 12 : 0);
}

// "2026-08" minus n months, as "YYYY-MM"
function monthsBefore(month, n) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) - n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/**
 * @param {object[]} records raw data.gov.sg rows
 * @param {{ windowMonths?: number }} options only use the most recent N months of sales (default 12)
 * @returns {object[]} one row per town + flat type, sorted by town then flat type
 */
export function summariseResale(records, { windowMonths = 12 } = {}) {
  const valid = records.filter((r) => /^\d{4}-\d{2}$/.test(r?.month ?? '') && Number(r?.resale_price) > 0);
  if (valid.length === 0) return [];

  const latest = valid.reduce((max, r) => (r.month > max ? r.month : max), valid[0].month);
  const from = monthsBefore(latest, windowMonths - 1);

  const groups = new Map();
  for (const r of valid) {
    if (r.month < from) continue;
    const key = `${r.town}|${r.flat_type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const [town, flatType] = key.split('|');
      return {
        town,
        flatType,
        medianPrice: Math.round(median(rows.map((r) => Number(r.resale_price)))),
        medianFloorAreaSqm: median(rows.map((r) => Number(r.floor_area_sqm))),
        medianRemainingLeaseYears: roundTo(median(rows.map((r) => parseRemainingLease(r.remaining_lease))), 1),
        transactions: rows.length,
        fromMonth: from,
        toMonth: latest,
      };
    })
    .sort((a, b) => a.town.localeCompare(b.town) || a.flatType.localeCompare(b.flatType));
}

function roundTo(value, dp) {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}
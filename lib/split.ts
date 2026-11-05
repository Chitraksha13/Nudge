export type Shares = Record<string, number>;

/** Equal split. Leftover cents go to the payer's share (or the first member if the payer isn't included). */
export function equalSplit(total: number, ids: string[], payerId: string): Shares {
  const out: Shares = {};
  if (ids.length === 0) return out;
  const base = Math.floor(total / ids.length);
  const rem = total - base * ids.length;
  ids.forEach((id) => (out[id] = base));
  out[ids.includes(payerId) ? payerId : ids[0]] += rem;
  return out;
}

/** Percent split: percentages must sum to 100. Largest-remainder rounding keeps the total exact. */
export function percentSplit(total: number, pcts: Record<string, number>): Shares | null {
  const ids = Object.keys(pcts);
  const sum = ids.reduce((a, id) => a + pcts[id], 0);
  if (ids.length === 0 || Math.abs(sum - 100) > 1e-9) return null;
  const raw = ids.map((id) => {
    const exact = (total * pcts[id]) / 100;
    const floor = Math.floor(exact + 1e-9);
    return { id, floor, frac: exact - floor };
  });
  const out: Shares = {};
  raw.forEach((r) => (out[r.id] = r.floor));
  let left = total - raw.reduce((a, r) => a + r.floor, 0);
  [...raw]
    .sort((a, b) => b.frac - a.frac)
    .forEach((r) => {
      if (left > 0) {
        out[r.id] += 1;
        left -= 1;
      }
    });
  return out;
}

/** Amounts split: shares must sum exactly to the total. */
export function amountsSplit(total: number, amounts: Shares): Shares | null {
  const ids = Object.keys(amounts);
  const sum = ids.reduce((a, id) => a + amounts[id], 0);
  return ids.length > 0 && sum === total ? { ...amounts } : null;
}

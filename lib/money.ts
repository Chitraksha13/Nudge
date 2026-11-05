export function fmt(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

/** Parse "12", "12.5", "$12.34" into integer cents. Returns null if invalid. */
export function parseDollars(input: string): number | null {
  const s = input.trim().replace(/^\$/, "");
  if (!/^\d*\.?\d{0,2}$/.test(s) || s === "" || s === ".") return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole || "0") * 100 + Number(frac.padEnd(2, "0"));
}

export function getLocalISODate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysISO(isoDate: string, deltaDays: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalISODate(dt);
}

export function addMonthsISO(isoDate: string, deltaMonths: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d); // local
  dt.setMonth(dt.getMonth() + deltaMonths);
  // stabilize to first of month for navigation (matches your intent)
  dt.setDate(1);
  return getLocalISODate(dt);
}

export function weekRangeMonSunISO(anchorISO: string) {
  const [y, m, d] = anchorISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const monday = new Date(dt);
  monday.setDate(dt.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { start: getLocalISODate(monday), end: getLocalISODate(sunday) };
}

export function monthRangeISO(anchorISO: string) {
  const [y, m] = anchorISO.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: getLocalISODate(start), end: getLocalISODate(end) };
}
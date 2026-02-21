export function fmtDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

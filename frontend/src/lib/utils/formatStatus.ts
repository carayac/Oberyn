export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

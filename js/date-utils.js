export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateOffset(days, from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat("en-IN", options).format(date) : "Date not set";
}

export function daysFromToday(value, today = localDate()) {
  const date = parseLocalDate(value);
  const current = parseLocalDate(today);
  return date && current ? Math.round((date - current) / 86400000) : null;
}

export function activityStatus(activity, today = localDate()) {
  if (activity.completedAt) return "Completed";
  const difference = daysFromToday(activity.scheduledDate, today);
  if (difference === null) return "Upcoming";
  if (difference < 0) return "Overdue";
  if (difference === 0) return "Due Today";
  if (difference <= 7) return "Due This Week";
  return "Upcoming";
}

export function daysLabel(activity, today = localDate()) {
  if (activity.completedAt) return "Completed";
  const difference = daysFromToday(activity.scheduledDate, today);
  if (difference === null) return "Date not set";
  if (difference < 0) return `${Math.abs(difference)} day${difference === -1 ? "" : "s"} overdue`;
  if (difference === 0) return "Due today";
  return `In ${difference} day${difference === 1 ? "" : "s"}`;
}

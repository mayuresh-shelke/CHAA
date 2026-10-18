export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function initials(name) {
  return String(name || "Demo User").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

import { store } from "./store.js";
import { categories, countStatus, currentActivities, personName, personRecord, renderPage, sortedActivities, workerName } from "./views.js";
import { esc, initials } from "./utils.js";
import { activityStatus, dateOffset, formatDate, localDate, parseLocalDate } from "./date-utils.js";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const roleNames = { asha: "ASHA Worker", anganwadi: "Anganwadi Worker", supervisor: "Supervisor" };
const routeNames = {
  dashboard: "Dashboard",
  beneficiaries: "Beneficiaries",
  "action-center": "Action Center",
  "follow-ups": "Follow-up Queue",
  immunization: "Immunization",
  maternal: "Maternal Monitoring",
  child: "Child Growth & Nutrition",
  reports: "Reports & Analytics",
  supervisor: "Supervisor Overview"
};
const navItems = [
  ["dashboard", "▦", "Dashboard"],
  ["beneficiaries", "♙", "Beneficiaries"],
  ["action-center", "◎", "Action Center"],
  ["follow-ups", "↻", "Follow-ups"],
  ["immunization", "✳", "Immunization"],
  ["maternal", "♡", "Maternal monitoring"],
  ["child", "⌂", "Child growth"],
  ["reports", "▤", "Reports"]
];
let session = readSession();
let menuOpen = false;
let profileMenuOpen = false;
let notificationsOpen = false;
let modal = null;
let activeFilters = {};

function readSession() {
  try { return JSON.parse(sessionStorage.getItem("chaa-demo-session") || "null"); }
  catch (error) {
    console.error("Could not read the demo session.", error);
    return null;
  }
}
function persistSession() {
  try { sessionStorage.setItem("chaa-demo-session", JSON.stringify(session)); }
  catch (error) { console.error("Could not save the demo session.", error); toast("This browser could not save the demo session.", "error"); }
}
function getRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [path = "dashboard", query = ""] = hash.split("?");
  const parts = path.split("/");
  return { page: parts[0] || "dashboard", id: parts[1] || "", params: new URLSearchParams(query) };
}
function navigate(route) {
  location.hash = `/${route}`;
  menuOpen = false;
  profileMenuOpen = false;
  notificationsOpen = false;
}
function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3600);
}
function layout(page, content) {
  const data = store.getState();
  const user = session || { name: "Demo User", role: "asha" };
  const route = getRoute();
  const unread = data.notifications.filter(notification => !notification.isRead).length;
  const links = [...navItems];
  if (user.role === "supervisor") links.push(["supervisor", "◫", "Supervisor view"]);
  const nav = links.map(([key, icon, label]) => `<a class="nav-link ${route.page === key ? "active" : ""}" href="#/${key}" ${route.page === key ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>${key === "action-center" && countStatus("Overdue", data) ? `<span class="nav-count">${countStatus("Overdue", data)}</span>` : ""}</a>`).join("");
  return `<div class="app-shell">
    <aside class="sidebar ${menuOpen ? "sidebar-open" : ""}" id="app-sidebar" aria-label="Main navigation">
      <a href="#/dashboard" class="brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M18 30s-11-6.6-11-15a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8.4-11 15-11 15Z"/><path d="M18 13v10M13 18h10"/></svg></span><span><strong>CHAA</strong><small>Community health assistant</small></span></a>
      <div class="workspace-label">YOUR WORKSPACE</div><nav class="primary-nav">${nav}</nav>
      <div class="sidebar-bottom"><div class="offline-card"><span class="online-dot"></span><div><strong>Offline demo mode</strong><small>Changes saved on this device</small></div></div><button type="button" class="sidebar-reset" data-action="reset">↺ &nbsp;Reset demo data</button></div>
    </aside>
    <div class="main-column">
      <header class="topbar ${menuOpen ? "topbar-nav-open" : ""}"><button class="icon-button mobile-menu" aria-label="${menuOpen ? "Close navigation" : "Open navigation"}" aria-expanded="${menuOpen}" data-action="toggle-menu">☰</button><div class="topbar-context"><span>Community workspace</span><span class="topbar-dot">/</span><strong>${esc(routeNames[route.page] || "Beneficiary profile")}</strong></div>
        <div class="topbar-actions"><span class="demo-pill"><span class="online-dot"></span>Demo data</span>
          <div class="notification-wrap"><button class="icon-button notification-button" aria-label="Notifications, ${unread} unread" aria-expanded="${notificationsOpen}" data-action="notifications">♧${unread ? `<span class="notification-badge">${unread}</span>` : ""}</button>
          ${notificationsOpen ? notificationPanel(data) : ""}</div>
          <div class="profile-wrap"><button class="profile-button" aria-expanded="${profileMenuOpen}" data-action="profile-menu"><span class="avatar">${esc(initials(user.name))}</span><span class="profile-label"><strong>${esc(user.name)}</strong><small>${esc(roleNames[user.role] || roleNames.asha)}</small></span><span aria-hidden="true">⌄</span></button>
          ${profileMenuOpen ? `<div class="profile-menu"><div class="menu-heading">Signed in for demo</div><button type="button" data-action="logout">↪ &nbsp;Exit demo</button><button type="button" data-action="reset">↺ &nbsp;Reset demo data</button></div>` : ""}</div>
        </div>
      </header>
      <main id="main-content" class="main-content">${content}<footer class="app-footer"><span>CHAA prototype · Fictional demonstration records only</span><span>For administrative follow-up, not clinical decisions</span></footer></main>
    </div>${modal ? renderModal() : ""}<div class="mobile-scrim ${menuOpen ? "visible" : ""}" data-action="close-menu"></div>
  </div>`;
}
function notificationPanel(data) {
  const items = data.notifications.slice(0, 6);
  return `<section class="notification-panel" aria-label="Notifications"><div class="notification-panel-head"><strong>Notifications</strong><button type="button" data-action="read-all">Mark all read</button></div>
    ${items.length ? items.map(item => `<button class="notification-item ${item.isRead ? "read" : ""}" type="button" data-action="open-notification" data-id="${esc(item.id)}"><span class="notification-item-dot"></span><span><strong>${esc(item.type)}</strong><small>${esc(item.message)}</small><small>${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt))}</small></span></button>`).join("") : `<p class="empty-inline">You're all caught up.</p>`}
    <p class="integration-note">In-app demo reminders only. No SMS, WhatsApp, or push delivery is connected.</p></section>`;
}
function loginView() {
  const savedName = session?.name || "";
  return `<div class="login-page"><div class="login-brand"><a href="#/login" class="brand brand-light"><span class="brand-mark"><svg viewBox="0 0 36 36"><path d="M18 30s-11-6.6-11-15a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8.4-11 15-11 15Z"/><path d="M18 13v10M13 18h10"/></svg></span><span><strong>CHAA</strong><small>Community Health Action Assistant</small></span></a></div>
    <main class="login-card"><div class="login-symbol"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="7" width="38" height="34" rx="8"/><path d="M24 15v18M15 24h18"/><path d="M11 37h26"/></svg></div><div class="eyebrow">COMMUNITY HEALTH · DEMO WORKSPACE</div><h1>Organize records.<br><span>Prioritize follow-ups.</span></h1><p class="login-description">A clear daily view for community health action.</p>
    <div class="demo-notice"><span aria-hidden="true">ⓘ</span><p><strong>Demonstration environment</strong><br>Use fictional records only. This is not secure production authentication.</p></div>
    <form id="login-form" novalidate><label for="login-name">Your demo name</label><input id="login-name" name="name" type="text" value="${esc(savedName)}" maxlength="50" placeholder="e.g. Meera Joshi" required autocomplete="name"><span class="field-error" data-error="name"></span>
      <label for="login-role">Choose your role</label><select id="login-role" name="role"><option value="asha" ${session?.role === "asha" ? "selected" : ""}>ASHA Worker</option><option value="anganwadi" ${session?.role === "anganwadi" ? "selected" : ""}>Anganwadi Worker</option><option value="supervisor" ${session?.role === "supervisor" ? "selected" : ""}>Supervisor</option></select>
      <button class="button button-primary button-full login-submit" type="submit">Enter demo workspace <span aria-hidden="true">→</span></button>
    </form><div class="login-footnote"><span class="online-dot"></span>All demo changes stay in this browser</div>
    </main><p class="login-legal">Synthetic sample data · No real patient information · Not for clinical decision-making</p></div>`;
}
function render() {
  if (!session) {
    app.innerHTML = loginView();
    return;
  }
  const route = getRoute();
  const content = renderPage(route, session.role, activeFilters, session.name);
  app.innerHTML = layout(route.page, content);
  if (modal) app.querySelector(".modal-dialog input:not([readonly]), .modal-dialog select, .modal-dialog textarea")?.focus();
}
function openBeneficiaryModal(id = "") {
  const data = store.getState();
  const person = data.beneficiaries.find(item => item.id === id);
  let nextNumber = Math.max(1000, ...data.beneficiaries.map(item => Number(item.id.match(/^CH-(\d+)$/)?.[1] || 0))) + 1;
  while (data.beneficiaries.some(item => item.id === `CH-${nextNumber}`)) nextNumber++;
  const generatedId = `CH-${nextNumber}`;
  modal = { type: "beneficiary", id, title: person ? "Edit beneficiary record" : "Add beneficiary", generatedId };
  render();
}
function renderModal() {
  const data = store.getState();
  if (modal.type === "beneficiary") {
    const person = data.beneficiaries.find(item => item.id === modal.id);
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><div class="eyebrow">SYNTHETIC DEMO RECORD</div><h2 id="modal-title">${modal.title}</h2></div><button class="icon-button" aria-label="Close" data-action="close-modal">×</button></div>
      <form id="beneficiary-form" novalidate><div class="form-grid"><label class="form-field">Demo beneficiary ID<input name="id" value="${esc(person?.id || modal.generatedId)}" readonly required maxlength="20"><span class="field-error" data-error="id"></span></label>
      <label class="form-field">Display name<input name="displayName" value="${esc(person?.displayName || "")}" maxlength="60" required placeholder="Fictional name"><span class="field-error" data-error="displayName"></span></label>
      <label class="form-field">Category<select name="category" required>${categories.map(category => `<option ${person?.category === category ? "selected" : ""}>${category}</option>`).join("")}</select><span class="field-error" data-error="category"></span></label>
      <label class="form-field">Age group<select name="ageGroup"><option value="">Choose age group</option>${["0–2 years", "2–5 years", "Adult", "Other"].map(age => `<option ${person?.ageGroup === age ? "selected" : ""}>${age}</option>`).join("")}</select><span class="field-error" data-error="ageGroup"></span></label>
      <label class="form-field">Assigned worker<select name="assignedWorkerId" required>${data.workers.map(worker => `<option value="${esc(worker.id)}" ${person?.assignedWorkerId === worker.id || (!person && worker.id === data.workers[0]?.id) ? "selected" : ""}>${esc(worker.name)} · ${esc(roleNames[worker.role])}</option>`).join("")}</select><span class="field-error" data-error="assignedWorkerId"></span></label>
      <label class="form-field">Next activity type<input name="activityType" value="${esc(person ? sortedActivities(data).find(item => item.beneficiaryId === person.id && activityStatus(item) !== "Completed")?.activityType || "" : "")}" maxlength="60" placeholder="e.g. Routine follow-up"><span class="field-error" data-error="activityType"></span></label>
      <label class="form-field">Next due date<input name="dueDate" type="date" min="${localDate()}" value="${esc(person ? sortedActivities(data).find(item => item.beneficiaryId === person.id && activityStatus(item) !== "Completed")?.scheduledDate || "" : "")}"><span class="field-error" data-error="dueDate"></span></label>
      <label class="form-field form-field-wide">Non-sensitive demo notes<textarea name="notes" rows="3" maxlength="160" placeholder="Administrative note only; do not enter medical details.">${esc(person?.notes || "")}</textarea><span class="field-error" data-error="notes"></span></label></div>
      <p class="form-helper">Do not enter real names, contact details, addresses, government identifiers, or sensitive health information.</p><div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save record</button></div></form></section></div>`;
  }
  if (modal.type === "complete") {
    const activity = data.activities.find(item => item.id === modal.id);
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal-dialog modal-small" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><div class="eyebrow">UPDATE ACTIVITY</div><h2 id="modal-title">Mark as complete</h2></div><button class="icon-button" aria-label="Close" data-action="close-modal">×</button></div>
      <p class="modal-description"><strong>${esc(activity?.activityType || "Activity")}</strong><br>${esc(personName(activity?.beneficiaryId, data))} · ${esc(activity?.id || "")}</p><form id="complete-form"><label class="form-field">Completion date<input name="date" type="date" value="${localDate()}" max="${localDate()}" required><span class="field-error" data-error="date"></span></label><label class="form-field">Optional non-sensitive note<textarea name="note" rows="3" maxlength="120" placeholder="Follow-up recorded"></textarea></label><div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Confirm completion</button></div></form></section></div>`;
  }
  if (modal.type === "reschedule") {
    const activity = data.activities.find(item => item.id === modal.id);
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal-dialog modal-small" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><div class="eyebrow">UPDATE SCHEDULE</div><h2 id="modal-title">Reschedule activity</h2></div><button class="icon-button" aria-label="Close" data-action="close-modal">×</button></div>
      <p class="modal-description"><strong>${esc(activity?.activityType || "Activity")}</strong><br>${esc(personName(activity?.beneficiaryId, data))} · Currently due ${formatDate(activity?.scheduledDate)}</p><form id="reschedule-form"><label class="form-field">New due date<input name="date" type="date" min="${dateOffset(1)}" value="${dateOffset(1)}" required><span class="field-error" data-error="date"></span></label><label class="form-field">Reason<select name="reason" required><option value="">Choose a reason</option><option>Beneficiary unavailable</option><option>Worker schedule change</option><option>Community activity rescheduled</option><option>Other administrative reason</option></select><span class="field-error" data-error="reason"></span></label><div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save new date</button></div></form></section></div>`;
  }
  if (modal.type === "immunization") {
    const record = data.immunizations.find(item => item.id === modal.id);
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal-dialog modal-small" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><div class="eyebrow">ILLUSTRATIVE RECORD ONLY</div><h2 id="modal-title">Record an update</h2></div><button class="icon-button" aria-label="Close" data-action="close-modal">×</button></div><p class="modal-description">${esc(personName(record?.beneficiaryId, data))} · ${esc(record?.activityName || "")}</p><form id="immunization-form"><label class="form-field">Recorded status<select name="status"><option>Completed</option><option>Scheduled</option></select></label><label class="form-field">Date recorded / scheduled<input name="date" type="date" value="${localDate()}" required></label><label class="form-field">Non-sensitive note<textarea name="note" maxlength="120" rows="2"></textarea></label><div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save update</button></div></form></section></div>`;
  }
  return "";
}
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
function showError(form, field, message) {
  const node = form.querySelector(`[data-error="${field}"]`);
  if (node) node.textContent = message;
  const input = form.elements.namedItem(field);
  if (input) input.setAttribute("aria-invalid", "true");
}
function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach(node => { node.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach(node => node.removeAttribute("aria-invalid"));
}
function submitLogin(form) {
  const values = formData(form);
  const name = String(values.name || "").trim();
  clearErrors(form);
  if (name.length < 2) { showError(form, "name", "Enter a demo name with at least 2 characters."); return; }
  if (name.length > 50) { showError(form, "name", "Use 50 characters or fewer."); return; }
  session = { name, role: ["asha", "anganwadi", "supervisor"].includes(values.role) ? values.role : "asha" };
  persistSession();
  navigate("dashboard");
  render();
  toast(`Welcome to the demo, ${name}.`);
}
function saveBeneficiary(form) {
  const values = formData(form);
  clearErrors(form);
  const id = String(values.id || "").trim().toUpperCase();
  const displayName = String(values.displayName || "").trim();
  const existingPerson = store.getState().beneficiaries.find(person => person.id === modal.id);
  const currentActivity = existingPerson && sortedActivities().find(item => item.beneficiaryId === modal.id && activityStatus(item) !== "Completed");
  const activityType = String(values.activityType || "").trim();
  let invalid = false;
  if (!/^CH-[A-Z0-9-]{3,16}$/.test(id)) { showError(form, "id", "Use a demo ID such as CH-1042."); invalid = true; }
  if (displayName.length < 2) { showError(form, "displayName", "Enter a display name with at least 2 characters."); invalid = true; }
  if (!categories.includes(values.category)) { showError(form, "category", "Choose a category."); invalid = true; }
  if (!store.getState().workers.some(worker => worker.id === values.assignedWorkerId)) { showError(form, "assignedWorkerId", "Choose a listed worker."); invalid = true; }
  if (values.dueDate && (!parseLocalDate(values.dueDate) || (values.dueDate < localDate() && values.dueDate !== currentActivity?.scheduledDate))) { showError(form, "dueDate", "Choose today or a future date, unless keeping this activity's existing overdue date."); invalid = true; }
  if (!!activityType !== !!values.dueDate) { showError(form, activityType ? "dueDate" : "activityType", "Enter both an activity type and due date, or leave both empty."); invalid = true; }
  if (invalid) return;
  const existing = existingPerson;
  try {
    const payload = { displayName, category: values.category, ageGroup: values.ageGroup, assignedWorkerId: values.assignedWorkerId, notes: String(values.notes || "").trim() };
    if (existing) {
      store.updateBeneficiary(modal.id, payload);
      const activity = sortedActivities().find(item => item.beneficiaryId === modal.id && activityStatus(item) !== "Completed");
      if (activity && activityType) store.updateActivity(activity.id, { activityType });
      if (activity && values.dueDate && activity.scheduledDate !== values.dueDate) store.rescheduleActivity(activity.id, values.dueDate, "Worker schedule change");
      if (!activity && activityType && values.dueDate) store.addActivity(modal.id, activityType, values.dueDate, values.assignedWorkerId);
      modal = null;
      navigate(`beneficiaries/${encodeURIComponent(existing.id)}`);
      render();
      toast("Beneficiary record updated.");
    } else {
      const person = { id, ...payload, createdAt: localDate() };
      store.addBeneficiary(person, activityType && values.dueDate ? { activityType, scheduledDate: values.dueDate, assignedWorkerId: values.assignedWorkerId } : null);
      modal = null;
      navigate(`beneficiaries/${encodeURIComponent(id)}`);
      render();
      toast("Beneficiary record added.");
    }
  } catch (error) { toast(error.message || "Could not save this record.", "error"); }
}
function exportCsv() {
  const data = store.getState();
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const rows = currentActivities(data).filter(activity => (!params.get("from") || activity.scheduledDate >= params.get("from")) && (!params.get("to") || activity.scheduledDate <= params.get("to")) && (!params.get("type") || activity.activityType === params.get("type")) && (!params.get("worker") || activity.assignedWorkerId === params.get("worker")) && (!params.get("status") || activityStatus(activity) === params.get("status")));
  const headers = ["Beneficiary", "Demo ID", "Activity", "Worker", "Due date", "Status"];
  const values = rows.map(activity => {
    const person = personRecord(activity.beneficiaryId, data);
    return [person?.displayName, activity.beneficiaryId, activity.activityType, workerName(activity.assignedWorkerId, data), activity.scheduledDate, activityStatus(activity)];
  });
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([[headers, ...values].map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "chaa-demo-activity-report.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Synthetic activity report exported.");
}
function exportImmunization() {
  const data = store.getState();
  const visibleChildren = new Set(data.beneficiaries.filter(person => person.category === "Child" && !person.archivedAt).map(person => person.id));
  const entries = data.immunizations.filter(record => visibleChildren.has(record.beneficiaryId)).map(record => [
    personName(record.beneficiaryId, data),
    record.beneficiaryId,
    record.activityName,
    record.status === "Completed" ? "Completed" : activityStatus({ scheduledDate: record.dueDate }),
    record.recordedDate || record.dueDate,
    record.note
  ]);
  const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [["Child", "Demo ID", "Illustrative record", "Status", "Recorded / due date", "Note"], ...entries].map(row => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "chaa-demo-immunization-summary.csv"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Synthetic immunization summary exported.");
}
function clickAction(button, event) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === "toggle-menu") { menuOpen = !menuOpen; profileMenuOpen = false; render(); }
  else if (action === "close-menu") { menuOpen = false; render(); }
  else if (action === "profile-menu") { profileMenuOpen = !profileMenuOpen; notificationsOpen = false; render(); }
  else if (action === "notifications") { notificationsOpen = !notificationsOpen; profileMenuOpen = false; menuOpen = false; render(); }
  else if (action === "logout") {
    session = null;
    try { sessionStorage.removeItem("chaa-demo-session"); } catch (error) { console.error("Could not clear the demo session.", error); }
    modal = null; menuOpen = false; profileMenuOpen = false; location.hash = "/login"; render();
  } else if (action === "reset") {
    if (window.confirm("Reset all synthetic demo records, activity updates, and notifications to their starting state?")) {
      try { store.reset(); menuOpen = false; profileMenuOpen = false; notificationsOpen = false; modal = null; toast("Demo data has been reset."); render(); }
      catch (error) { toast(`Could not reset demo data: ${error.message}`, "error"); }
    }
  } else if (action === "add-beneficiary") openBeneficiaryModal();
  else if (action === "edit-beneficiary") openBeneficiaryModal(id);
  else if (action === "archive-beneficiary") {
    if (window.confirm("Archive this synthetic beneficiary record? It will be hidden from the directory but retained in the demo history.")) {
      try { store.updateBeneficiary(id, { archivedAt: new Date().toISOString() }); toast("Record archived."); navigate("beneficiaries"); render(); }
      catch (error) { toast(error.message, "error"); }
    }
  } else if (action === "complete") { modal = { type: "complete", id }; render(); }
  else if (action === "reschedule") { modal = { type: "reschedule", id }; render(); }
  else if (action === "close-modal") { modal = null; render(); }
  else if (action === "backdrop" && event.target === button) { modal = null; render(); }
  else if (action === "clear-beneficiary-filters") navigate("beneficiaries");
  else if (action === "clear-followup-filters") navigate("follow-ups");
  else if (action === "clear-report-filters") navigate("reports");
  else if (action === "clear-supervisor-filters") { activeFilters = {}; render(); }
  else if (action === "worker-summary") { activeFilters.worker = id; render(); }
  else if (action === "read-all") { try { store.markAllNotificationsRead(); render(); } catch (error) { toast(error.message, "error"); } }
  else if (action === "open-notification") {
    const notification = store.getState().notifications.find(item => item.id === id);
    try { store.markNotificationRead(id); } catch (error) { toast(error.message, "error"); }
    notificationsOpen = false; render();
    const related = store.getState().activities.find(item => item.id === notification?.relatedEntityId);
    if (related) navigate(`beneficiaries/${encodeURIComponent(related.beneficiaryId)}`);
    else if (personRecord(notification?.relatedEntityId)) navigate(`beneficiaries/${encodeURIComponent(notification.relatedEntityId)}`);
    else navigate("follow-ups");
  } else if (action === "record-immunization") { modal = { type: "immunization", id }; render(); }
  else if (action === "export-csv") exportCsv();
  else if (action === "export-immunization") exportImmunization();
  else if (action === "print") window.print();
}
app.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (button) clickAction(button, event);
});
app.addEventListener("submit", event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const formId = form.getAttribute("id");
  if (formId === "login-form") submitLogin(form);
  else if (formId === "beneficiary-form") saveBeneficiary(form);
  else if (formId === "beneficiary-filters") {
    const data = formData(form); navigate(`beneficiaries?q=${encodeURIComponent(data.q.trim())}&category=${encodeURIComponent(data.category)}&status=${encodeURIComponent(data.status)}`);
  } else if (formId === "followup-filters") {
    const data = formData(form); navigate(`follow-ups?q=${encodeURIComponent(data.q.trim())}&type=${encodeURIComponent(data.type)}&worker=${encodeURIComponent(data.worker)}&status=${encodeURIComponent(data.status)}&sort=${encodeURIComponent(data.sort)}`);
  } else if (formId === "report-filters") {
    const data = formData(form);
    if (data.from && data.to && data.from > data.to) { toast("The start date must be on or before the end date.", "error"); return; }
    navigate(`reports?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}&type=${encodeURIComponent(data.type)}&worker=${encodeURIComponent(data.worker)}&status=${encodeURIComponent(data.status)}`);
  } else if (formId === "supervisor-filters") {
    const data = formData(form);
    if ((data.from && !parseLocalDate(data.from)) || (data.to && !parseLocalDate(data.to))) { toast("Choose valid date range values.", "error"); return; }
    if (data.from && data.to && data.from > data.to) { toast("The start date must be on or before the end date.", "error"); return; }
    activeFilters = { worker: data.worker, from: data.from, to: data.to };
    render();
  } else if (formId === "complete-form") {
    const data = formData(form);
    if (!parseLocalDate(data.date) || data.date > localDate()) { showError(form, "date", "Choose a valid date no later than today."); return; }
    try { store.completeActivity(modal.id, { date: data.date, note: String(data.note || "").trim() }); modal = null; render(); toast("Activity marked complete."); }
    catch (error) { toast(error.message, "error"); }
  } else if (formId === "reschedule-form") {
    const data = formData(form);
    if (!parseLocalDate(data.date) || data.date <= localDate()) { showError(form, "date", "Choose a valid future date."); return; }
    if (!data.reason) { showError(form, "reason", "Choose a reason to preserve the scheduling history."); return; }
    try { store.rescheduleActivity(modal.id, data.date, data.reason); modal = null; render(); toast("Activity rescheduled; the previous date is recorded in its history."); }
    catch (error) { toast(error.message, "error"); }
  } else if (formId === "immunization-form") {
    const data = formData(form);
    if (!parseLocalDate(data.date)) { toast("Choose a valid recorded date.", "error"); return; }
    try {
      store.updateImmunization(modal.id, { status: data.status, recordedDate: data.status === "Completed" ? data.date : "", dueDate: data.status === "Scheduled" ? data.date : "", note: String(data.note || "").trim() });
      modal = null; render(); toast("Illustrative immunization record updated.");
    } catch (error) { toast(error.message, "error"); }
  }
});
function filterImmunizationRows() {
  const query = (document.querySelector("#immunization-search")?.value || "").toLowerCase().trim();
  const status = document.querySelector("#immunization-filter")?.value || "";
  document.querySelectorAll("#immunization-table tbody tr").forEach(row => {
    row.hidden = !row.dataset.search.includes(query) || (!!status && row.dataset.status !== status && !(status === "Scheduled" && ["Due Today", "Due This Week", "Upcoming"].includes(row.dataset.status)));
  });
}
app.addEventListener("input", event => {
  if (event.target.id === "immunization-search") filterImmunizationRows();
});
app.addEventListener("change", event => {
  if (event.target.id === "supervisor-worker") { activeFilters.worker = event.target.value; render(); }
  if (event.target.id === "immunization-filter") filterImmunizationRows();
});
window.addEventListener("hashchange", () => {
  menuOpen = false;
  profileMenuOpen = false;
  notificationsOpen = false;
  if (session && getRoute().page === "login") { location.hash = "/dashboard"; return; }
  if (session) render();
  else if (location.hash !== "#/login" && location.hash !== "#login") { location.hash = "/login"; render(); }
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (modal) { modal = null; render(); }
    else if (menuOpen || profileMenuOpen || notificationsOpen) { menuOpen = false; profileMenuOpen = false; notificationsOpen = false; render(); }
  }
});
if (!location.hash) location.hash = session ? "/dashboard" : "/login";
if (session && getRoute().page === "login") location.hash = "/dashboard";
render();

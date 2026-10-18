import { store } from "./store.js";
import { activityStatus, dateOffset, daysLabel, formatDate, localDate } from "./date-utils.js";
import { esc, initials } from "./utils.js";

export const categories = ["Pregnant Woman", "Lactating Mother", "Child", "Other Beneficiary"];
const supervisorDemo = [
  ["Meera Joshi", 110, 4, 1], ["Kavita Deshmukh", 108, 4, 1], ["Farah Shaikh", 106, 4, 1],
  ["Nitin Pawar", 112, 4, 1], ["Rupa Shinde", 104, 4, 1], ["Sameer Khan", 109, 4, 1],
  ["Lata More", 107, 4, 1], ["Sunita Patil", 111, 4, 1], ["Anjali Jadhav", 105, 4, 1],
  ["Mohan Kale", 108, 4, 1], ["Rekha Bhosale", 102, 4, 1], ["Aarti Gaikwad", 102, 4, 0]
].map(([name, beneficiaries, pending, overdue], index) => ({ id: `SD-${index + 1}`, name, beneficiaries, pending, overdue }));

export function workerName(id, data = store.getState()) {
  return data.workers.find(worker => worker.id === id)?.name || "Unassigned";
}
export function personName(id, data = store.getState()) {
  return data.beneficiaries.find(person => person.id === id)?.displayName || "Unknown beneficiary";
}
export function personRecord(id, data = store.getState()) {
  return data.beneficiaries.find(person => person.id === id);
}
export function currentActivities(data = store.getState()) {
  const currentBeneficiaryIds = new Set(data.beneficiaries.filter(person => !person.archivedAt).map(person => person.id));
  return data.activities.filter(activity => currentBeneficiaryIds.has(activity.beneficiaryId));
}
function activitiesFor(personId, data = store.getState()) {
  return data.activities.filter(activity => activity.beneficiaryId === personId);
}
export function sortedActivities(data = store.getState()) {
  const weight = { Overdue: 0, "Due Today": 1, "Due This Week": 2, Upcoming: 3, Completed: 4 };
  return [...currentActivities(data)].sort((a, b) => {
    const statusDifference = weight[activityStatus(a)] - weight[activityStatus(b)];
    return statusDifference || a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id);
  });
}
export function countStatus(status, data = store.getState()) {
  return currentActivities(data).filter(activity => activityStatus(activity) === status).length;
}
function personStatus(person, data = store.getState()) {
  const records = activitiesFor(person.id, data);
  const upcoming = records.map(activity => activityStatus(activity));
  if (upcoming.includes("Overdue")) return "Overdue";
  if (upcoming.includes("Due Today")) return "Due Today";
  if (records.length && records.every(activity => activityStatus(activity) === "Completed")) return "Completed";
  if (upcoming.includes("Due This Week")) return "Follow-up Required";
  return "Active";
}
function statusClass(status) {
  return ({ Overdue: "danger", "Due Today": "warning", "Due This Week": "warning", Upcoming: "neutral", Completed: "success", Active: "success", "Follow-up Required": "warning", Scheduled: "neutral" })[status] || "neutral";
}
function statusChip(status) {
  return `<span class="status-chip status-${statusClass(status)}"><span class="status-dot" aria-hidden="true"></span>${esc(status)}</span>`;
}
function pageHeading(title, subtitle, eyebrow = "COMMUNITY HEALTH OPERATIONS") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div></div>`;
}
function actionFor(activity, data = store.getState(), compact = false) {
  const person = personRecord(activity.beneficiaryId, data);
  const status = activityStatus(activity);
  return `<article class="activity-card ${status === "Overdue" ? "activity-urgent" : ""}">
    <div class="activity-main"><div class="activity-name-line"><h3>${esc(person?.displayName || "Unknown beneficiary")}</h3>${statusChip(status)}</div>
      <div class="activity-meta"><span>${esc(person?.category || "Beneficiary")}</span><span>${esc(activity.activityType)}</span><span>${esc(activity.id)}</span></div>
      <div class="activity-details"><span><b>Due</b> ${formatDate(activity.scheduledDate)}</span><span class="due-label ${status === "Overdue" ? "text-danger" : ""}">${daysLabel(activity)}</span>${!compact ? `<span><b>Worker</b> ${esc(workerName(activity.assignedWorkerId, data))}</span>` : ""}</div>
    </div>
    <div class="activity-actions"><a class="button button-secondary button-small" href="#/beneficiaries/${encodeURIComponent(activity.beneficiaryId)}">View record</a>
    ${status !== "Completed" ? `<button class="button button-quiet button-small" type="button" data-action="reschedule" data-id="${esc(activity.id)}">Reschedule</button><button class="button button-primary button-small" type="button" data-action="complete" data-id="${esc(activity.id)}">Mark complete</button>` : ""}</div>
  </article>`;
}
function metricCard(label, value, caption, icon, tone, route, filter) {
  return `<a class="metric-card metric-${tone}" href="#/${route}${filter ? `?status=${encodeURIComponent(filter)}` : ""}">
    <span class="metric-icon" aria-hidden="true">${icon}</span><span class="metric-label">${label}</span><strong>${value}</strong><span class="metric-caption">${caption}</span>
  </a>`;
}
function dashboardView(userName) {
  const data = store.getState();
  const todayCount = countStatus("Due Today", data);
  const overdue = countStatus("Overdue", data);
  const week = countStatus("Due This Week", data);
  const completed = countStatus("Completed", data);
  const activities = currentActivities(data);
  const active = sortedActivities(data).filter(activity => activityStatus(activity) !== "Completed");
  const priorities = active.slice(0, 5);
  const population = categories.map(category => ({ category, count: data.beneficiaries.filter(person => person.category === category && !person.archivedAt).length }));
  const maxPopulation = Math.max(1, ...population.map(item => item.count));
  return `<section class="welcome-row"><div><div class="eyebrow">YOUR DAILY OVERVIEW</div><h1>Good morning, ${esc(userName)}</h1><p>Here is your community health activity overview.</p></div><div class="date-card"><span class="date-icon">▦</span><span><strong>${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date())}</strong><small>${formatDate(localDate())}</small></span></div></section>
    <div class="data-disclaimer"><span aria-hidden="true">ⓘ</span>Fictional prototype data. Activity priority is based on scheduled dates—not clinical risk.</div>
    <section class="metrics-grid" aria-label="Activity summary">
      ${metricCard("Total beneficiaries", data.beneficiaries.filter(person => !person.archivedAt).length, "In your demo workspace", "♙", "teal", "beneficiaries")}
      ${metricCard("Overdue activities", overdue, "Needs a follow-up", "◷", "red", "follow-ups", "Overdue")}
      ${metricCard("Due today", todayCount, "Scheduled for today", "◉", "amber", "follow-ups", "Due Today")}
      ${metricCard("Due this week", week, "Next 7 calendar days", "↗", "blue", "follow-ups", "Due This Week")}
    </section>
    <div class="dashboard-grid"><section class="panel priorities-panel"><div class="panel-heading"><div><div class="eyebrow">START WITH WHAT'S URGENT</div><h2>Today's priority actions</h2></div><a class="text-link" href="#/action-center">Open Action Center <span aria-hidden="true">→</span></a></div>
      <div class="priority-list">${priorities.length ? priorities.map(activity => actionFor(activity, data, true)).join("") : emptyState("You're up to date", "There are no pending activities in this demo queue.")}</div>
      <a class="button button-secondary button-full" href="#/action-center">View all activities</a>
    </section><aside class="dashboard-side">
      <section class="panel snapshot-panel"><div class="panel-heading"><div><div class="eyebrow">YOUR COMMUNITY</div><h2>Beneficiary snapshot</h2></div><a class="small-link" href="#/beneficiaries">View all</a></div>
        <div class="snapshot-total"><strong>${data.beneficiaries.filter(person => !person.archivedAt).length}</strong><span>demo records</span></div>
        <div class="population-bars">${population.map(item => `<div class="population-row"><div><span>${esc(item.category === "Pregnant Woman" ? "Pregnant women" : item.category === "Lactating Mother" ? "Lactating mothers" : item.category === "Other Beneficiary" ? "Other monitored" : "Children")}</span><strong>${item.count}</strong></div><span class="bar-track"><span class="bar-fill" style="width:${Math.max(item.count ? 8 : 0, item.count / maxPopulation * 100)}%"></span></span></div>`).join("")}</div>
      </section><section class="panel progress-panel"><div class="panel-heading"><div><div class="eyebrow">ACTIVITY PROGRESS</div><h2>Follow-up overview</h2></div></div>
        <div class="progress-stat"><span class="progress-icon completed-icon">✓</span><span><strong>${completed}</strong><small>Completed activities</small></span><span class="progress-track"><span class="progress-fill fill-green" style="width:${data.activities.length ? completed / data.activities.length * 100 : 0}%"></span></span></div>
        <div class="progress-stat"><span class="progress-icon pending-icon">↻</span><span><strong>${activities.length - completed}</strong><small>Pending activities</small></span><span class="progress-track"><span class="progress-fill fill-amber" style="width:${activities.length ? (activities.length - completed) / activities.length * 100 : 0}%"></span></span></div>
        <div class="progress-stat"><span class="progress-icon overdue-icon">!</span><span><strong>${overdue}</strong><small>Overdue activities</small></span><a class="small-link" href="#/follow-ups?status=Overdue">View</a></div>
      </section></aside></div>
    <div class="dashboard-shortcuts"><a href="#/maternal"><span>♡</span><strong>Maternal monitoring</strong><small>Scheduled follow-ups</small><b>→</b></a><a href="#/child"><span>⌂</span><strong>Child growth & nutrition</strong><small>Recorded observations</small><b>→</b></a><a href="#/immunization"><span>✳</span><strong>Immunization tracking</strong><small>Recorded milestones</small><b>→</b></a></div>`;
}
function emptyState(title, description) {
  return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">✓</span><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
}
function beneficiaryView(params) {
  const data = store.getState();
  const filters = { search: params.get("q") || "", category: params.get("category") || "", status: params.get("status") || "" };
  const items = data.beneficiaries.filter(person => !person.archivedAt).filter(person => {
    const query = filters.search.trim().toLowerCase();
    return (!query || person.displayName.toLowerCase().includes(query) || person.id.toLowerCase().includes(query)) &&
      (!filters.category || person.category === filters.category) && (!filters.status || personStatus(person, data) === filters.status);
  });
  return `${pageHeading("Beneficiaries", "Find, view, and update the records assigned to your community.")}
    <section class="panel directory-panel"><form id="beneficiary-filters" class="filter-toolbar">
      <label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">Search beneficiaries</span><input name="q" value="${esc(filters.search)}" placeholder="Search name or demo ID"></label>
      <label class="select-field"><span class="sr-only">Filter by category</span><select name="category"><option value="">All categories</option>${categories.map(category => `<option ${filters.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label>
      <label class="select-field"><span class="sr-only">Filter by status</span><select name="status"><option value="">All statuses</option>${["Active", "Follow-up Required", "Due Today", "Overdue", "Completed"].map(status => `<option ${filters.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      <button class="button button-primary" type="submit">Search</button><button class="button button-quiet" type="button" data-action="clear-beneficiary-filters">Clear</button>
      <button class="button button-primary add-button" type="button" data-action="add-beneficiary">＋ Add beneficiary</button>
    </form><div class="table-summary"><strong>${items.length} ${items.length === 1 ? "record" : "records"}</strong><span>Only fictional demo details are shown.</span></div>
    ${items.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Beneficiary</th><th>Category</th><th>Age group</th><th>Assigned worker</th><th>Next activity</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${items.map(person => {
      const next = sortedActivities(data).find(activity => activity.beneficiaryId === person.id && activityStatus(activity) !== "Completed");
      const status = personStatus(person, data);
      return `<tr><td><a class="person-link" href="#/beneficiaries/${encodeURIComponent(person.id)}"><strong>${esc(person.displayName)}</strong><small>${esc(person.id)}</small></a></td><td>${esc(person.category)}</td><td>${esc(person.ageGroup || "Not recorded")}</td><td>${esc(workerName(person.assignedWorkerId, data))}</td><td>${next ? `${esc(next.activityType)}<small>${formatDate(next.scheduledDate)}</small>` : "No pending activity"}</td><td>${statusChip(status)}</td><td><a class="row-action" href="#/beneficiaries/${encodeURIComponent(person.id)}">View <span aria-hidden="true">→</span></a></td></tr>`;
    }).join("")}</tbody></table></div>` : emptyState("No beneficiaries match", "Try clearing a filter or changing your search.")}</section>`;
}
function actionCenterView() {
  const data = store.getState();
  const groups = ["Overdue", "Due Today", "Due This Week", "Upcoming", "Completed"];
  const activities = sortedActivities(data);
  return `${pageHeading("Action Center", "From records to timely action.", "YOUR DAILY PRIORITY LIST")}
    <section class="action-intro"><div class="action-intro-icon">◎</div><div><h2>Who needs my attention today?</h2><p>Use this list to organize your next follow-up. CHAA does not assess clinical risk.</p></div><a class="button button-primary" href="#/follow-ups">Open follow-up queue <span aria-hidden="true">→</span></a></section>
    <section class="workflow panel"><div class="workflow-title"><span class="eyebrow">A SIMPLE FOLLOW-UP WORKFLOW</span><span>Scheduling rules use local calendar dates</span></div><div class="workflow-steps">${["Beneficiary records", "Monitoring rules", "Due & overdue", "Priority list", "Worker follow-up", "Updated record"].map((label, index) => `<div class="workflow-step"><span>${String(index + 1).padStart(2, "0")}</span><strong>${label}</strong>${index < 5 ? `<i aria-hidden="true">→</i>` : ""}</div>`).join("")}</div></section>
    <div class="queue-sections">${groups.map(group => {
      const items = activities.filter(activity => activityStatus(activity) === group);
      return `<section class="queue-section"><div class="queue-section-heading"><div><span class="queue-marker marker-${statusClass(group)}"></span><h2>${group}</h2></div><span class="count-pill">${items.length}</span></div>${items.length ? `<div class="activity-list">${items.map(activity => actionFor(activity, data)).join("")}</div>` : `<div class="queue-empty">${group === "Completed" ? "No activities have been completed yet." : `No ${group.toLowerCase()} activities.`}</div>`}</section>`;
    }).join("")}</div>`;
}
function followupsView(params) {
  const data = store.getState();
  const filters = { q: params.get("q") || "", type: params.get("type") || "", worker: params.get("worker") || "", status: params.get("status") || "", sort: params.get("sort") || "asc" };
  const entries = sortedActivities(data).filter(activity => {
    const status = activityStatus(activity);
    const matchesStatus = !filters.status || status === filters.status;
    const person = personRecord(activity.beneficiaryId, data);
    const search = filters.q.trim().toLowerCase();
    return matchesStatus && (!search || `${person?.displayName} ${person?.id}`.toLowerCase().includes(search)) &&
      (!filters.type || activity.activityType === filters.type) && (!filters.worker || activity.assignedWorkerId === filters.worker);
  }).sort((a, b) => (filters.sort === "desc" ? b.scheduledDate.localeCompare(a.scheduledDate) : a.scheduledDate.localeCompare(b.scheduledDate)));
  const activeEntries = entries.filter(activity => activityStatus(activity) !== "Completed");
  const groups = ["Overdue", "Due Today", "Due This Week", "Upcoming"];
  return `${pageHeading("Follow-up Queue", "Keep upcoming and overdue community activities moving.")}
    <div class="metrics-grid queue-metrics">${metricCard("Overdue", countStatus("Overdue", data), "Needs follow-up", "◷", "red", "follow-ups", "Overdue")}${metricCard("Due today", countStatus("Due Today", data), "Scheduled for today", "◉", "amber", "follow-ups", "Due Today")}${metricCard("Due this week", countStatus("Due This Week", data), "Next 7 calendar days", "↗", "blue", "follow-ups", "Due This Week")}</div>
    <section class="panel"><form id="followup-filters" class="filter-toolbar followup-filters"><label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">Search queue</span><input name="q" value="${esc(filters.q)}" placeholder="Search beneficiary"></label>
      <label class="select-field"><span class="sr-only">Filter by activity type</span><select name="type"><option value="">All activity types</option>${[...new Set(data.activities.map(item => item.activityType))].map(type => `<option ${filters.type === type ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label>
      <label class="select-field"><span class="sr-only">Filter by worker</span><select name="worker"><option value="">All workers</option>${data.workers.map(worker => `<option value="${esc(worker.id)}" ${filters.worker === worker.id ? "selected" : ""}>${esc(worker.name)}</option>`).join("")}</select></label>
      <label class="select-field"><span class="sr-only">Filter by status</span><select name="status"><option value="">All statuses</option>${["Overdue", "Due Today", "Due This Week", "Upcoming", "Completed"].map(status => `<option ${filters.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      <label class="select-field sort-field"><span class="sr-only">Sort by due date</span><select name="sort"><option value="asc" ${filters.sort === "asc" ? "selected" : ""}>Earliest due</option><option value="desc" ${filters.sort === "desc" ? "selected" : ""}>Latest due</option></select></label><button class="button button-primary" type="submit">Apply</button><button class="button button-quiet" type="button" data-action="clear-followup-filters">Clear</button></form>
      <div class="queue-view-head"><div><strong>${entries.length} activities</strong><span>${activeEntries.length} pending · ${entries.length - activeEntries.length} completed</span></div><span class="offline-label"><span class="online-dot"></span>Saved locally</span></div>
      ${entries.length ? groups.map(group => {
        const items = entries.filter(activity => activityStatus(activity) === group);
        return items.length ? `<section class="queue-section compact-section"><div class="queue-section-heading"><div><span class="queue-marker marker-${statusClass(group)}"></span><h2>${group}</h2></div><span class="count-pill">${items.length}</span></div><div class="activity-list">${items.map(activity => actionFor(activity, data, true)).join("")}</div></section>` : "";
      }).join("") + (entries.some(activity => activityStatus(activity) === "Completed") ? `<section class="queue-section compact-section"><div class="queue-section-heading"><div><span class="queue-marker marker-success"></span><h2>Completed</h2></div></div><div class="activity-list">${entries.filter(activity => activityStatus(activity) === "Completed").map(activity => actionFor(activity, data, true)).join("")}</div></section>` : "") : emptyState("No activities match", "Change your filters or clear them to see the full queue.")}</section>`;
}
function profileView(id) {
  const data = store.getState();
  const person = personRecord(id, data);
  if (!person) return `${pageHeading("Record not found", "This demo record may have been removed.")}<a class="button button-secondary" href="#/beneficiaries">Back to beneficiaries</a>`;
  const activities = activitiesFor(id, data).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const imm = data.immunizations.filter(record => record.beneficiaryId === id);
  const history = activities.flatMap(activity => activity.history.map(item => ({ ...item, activityType: activity.activityType, id: activity.id }))).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="breadcrumb"><a href="#/beneficiaries">Beneficiaries</a><span>/</span><span>${esc(person.id)}</span></div>
    <section class="profile-hero"><div class="profile-person"><span class="large-avatar">${esc(initials(person.displayName))}</span><div><div class="eyebrow">${esc(person.id)} · SYNTHETIC RECORD</div><h1>${esc(person.displayName)}</h1><p>${esc(person.category)} <span>·</span> ${esc(person.ageGroup || "Age group not recorded")}</p></div></div><div class="profile-actions">${statusChip(personStatus(person, data))}<button class="button button-secondary" data-action="edit-beneficiary" data-id="${esc(person.id)}">Edit record</button><button class="button button-quiet" data-action="archive-beneficiary" data-id="${esc(person.id)}">Archive</button></div></section>
    <div class="profile-grid"><div class="profile-main">
      <section class="panel"><div class="panel-heading"><div><div class="eyebrow">RECORD OVERVIEW</div><h2>Beneficiary details</h2></div></div><div class="detail-grid"><div><small>Demo ID</small><strong>${esc(person.id)}</strong></div><div><small>Category</small><strong>${esc(person.category)}</strong></div><div><small>Age group</small><strong>${esc(person.ageGroup || "Not recorded")}</strong></div><div><small>Assigned worker</small><strong>${esc(workerName(person.assignedWorkerId, data))}</strong></div><div><small>Next activity</small><strong>${esc(sortedActivities(data).find(item => item.beneficiaryId === id && activityStatus(item) !== "Completed")?.activityType || "None scheduled")}</strong></div><div><small>Non-sensitive notes</small><strong>${esc(person.notes || "No notes")}</strong></div></div></section>
      <section class="panel"><div class="panel-heading"><div><div class="eyebrow">MONITORING</div><h2>Scheduled activities</h2></div><a class="small-link" href="#/action-center">Open Action Center</a></div>${activities.length ? `<div class="history-list">${activities.map(activity => `<div class="history-item"><span class="history-marker ${statusClass(activityStatus(activity))}"></span><div><strong>${esc(activity.activityType)}</strong><small>Scheduled ${formatDate(activity.scheduledDate)} · ${esc(activity.id)}</small>${activity.history.map(record => `<small>${record.type === "rescheduled" ? `Rescheduled from ${formatDate(record.from)}: ${esc(record.note)}` : `Completed ${formatDate(record.date)}${record.note ? ` · ${esc(record.note)}` : ""}`}</small>`).join("")}</div>${statusChip(activityStatus(activity))}</div>`).join("")}</div>` : emptyState("No monitoring activity", "No activities are linked to this demo record.")}</section>
      <section class="panel"><div class="panel-heading"><div><div class="eyebrow">RECORDED HISTORY</div><h2>Recent follow-ups</h2></div></div>${history.length ? `<div class="history-list">${history.map(item => `<div class="history-item"><span class="history-marker ${item.type === "completed" ? "success" : "warning"}"></span><div><strong>${item.type === "completed" ? "Follow-up completed" : "Activity rescheduled"} · ${esc(item.activityType)}</strong><small>${formatDate(item.date)}${item.note ? ` · ${esc(item.note)}` : ""}</small></div></div>`).join("")}</div>` : emptyState("No visit history yet", "Completed and rescheduled activities appear here.")}</section>
    </div><aside class="profile-side"><section class="panel"><div class="eyebrow">IMMUNIZATION</div><h2>Recorded milestones</h2>${imm.length ? imm.map(item => `<div class="immunization-mini"><strong>${esc(item.activityName)}</strong>${statusChip(item.status === "Completed" ? "Completed" : activityStatus({ scheduledDate: item.dueDate }))}<small>${item.recordedDate ? `Recorded ${formatDate(item.recordedDate)}` : `Due ${formatDate(item.dueDate)}`}</small></div>`).join("") : `<p class="muted">No immunization records linked.</p>`}<a class="small-link" href="#/immunization">Open immunization</a></section>
    <section class="panel safety-panel"><span>ⓘ</span><p>This record is synthetic and for administrative demo use only. It does not provide a diagnosis or treatment guidance.</p></section></aside></div>`;
}
function immunizationView() {
  const data = store.getState();
  const children = data.beneficiaries.filter(person => person.category === "Child" && !person.archivedAt);
  const records = data.immunizations.filter(record => children.some(child => child.id === record.beneficiaryId));
  return `${pageHeading("Immunization", "Organize recorded vaccination milestones and scheduled follow-ups.")}
    <div class="data-disclaimer"><span aria-hidden="true">ⓘ</span>Illustrative demonstration entries only. No authoritative schedule or dose recommendations are provided. Verify any real schedule with programme authorities.</div>
    <section class="panel"><div class="filter-toolbar"><label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">Search children</span><input id="immunization-search" placeholder="Search child or demo ID"></label><label class="select-field"><span class="sr-only">Filter immunization records</span><select id="immunization-filter"><option value="">All recorded statuses</option><option>Completed</option><option>Scheduled</option><option>Overdue</option></select></label><button class="button button-secondary" data-action="export-immunization">Export summary</button></div>
    <div class="table-scroll"><table class="data-table" id="immunization-table"><thead><tr><th>Child</th><th>Recorded milestone</th><th>Status</th><th>Recorded / due date</th><th>Notes</th><th>Action</th></tr></thead><tbody>${records.map(record => {
      const person = personRecord(record.beneficiaryId, data);
      const status = record.status === "Completed" ? "Completed" : activityStatus({ scheduledDate: record.dueDate });
      return `<tr data-search="${esc(`${person.displayName} ${person.id} ${record.activityName}`.toLowerCase())}" data-status="${esc(status)}"><td><a class="person-link" href="#/beneficiaries/${encodeURIComponent(person.id)}"><strong>${esc(person.displayName)}</strong><small>${esc(person.id)}</small></a></td><td>${esc(record.activityName)}<small>Illustrative demo record</small></td><td>${statusChip(status)}</td><td>${record.recordedDate ? formatDate(record.recordedDate) : `Due ${formatDate(record.dueDate)}`}</td><td>${esc(record.note || "—")}</td><td>${record.status !== "Completed" ? `<button class="row-action" data-action="record-immunization" data-id="${esc(record.id)}">Record update</button>` : "—"}</td></tr>`;
    }).join("")}</tbody></table>${records.length ? "" : emptyState("No child records", "Add a child beneficiary to start organizing demo milestones.")}</div>
    <p class="table-note">These records help organize information only. The prototype does not infer eligibility or recommend doses from age.</p></section>`;
}
function maternalView() {
  const data = store.getState();
  const people = data.beneficiaries.filter(person => ["Pregnant Woman", "Lactating Mother"].includes(person.category) && !person.archivedAt);
  return `${pageHeading("Maternal Monitoring", "Organize scheduled maternal and postpartum follow-ups.", "MATERNAL & POSTPARTUM")}
    <div class="data-disclaimer"><span aria-hidden="true">ⓘ</span>Schedules are illustrative demo entries, not official antenatal or postnatal guidance. Health decisions stay with qualified professionals.</div>
    <section class="panel"><div class="table-summary"><strong>${people.length} maternal and postpartum records</strong><span>Structured monitoring dates and recorded history</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Beneficiary</th><th>Monitoring category</th><th>Assigned worker</th><th>Last recorded follow-up</th><th>Next activity</th><th>Status</th><th>Record</th></tr></thead><tbody>${people.map(person => {
      const acts = activitiesFor(person.id, data).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
      const next = acts.find(activity => activityStatus(activity) !== "Completed");
      const last = acts.find(activity => activityStatus(activity) === "Completed");
      return `<tr><td><a class="person-link" href="#/beneficiaries/${encodeURIComponent(person.id)}"><strong>${esc(person.displayName)}</strong><small>${esc(person.id)}</small></a></td><td>${esc(person.category)}</td><td>${esc(workerName(person.assignedWorkerId, data))}</td><td>${last ? formatDate(last.completedAt) : "Not recorded"}</td><td>${next ? `${esc(next.activityType)}<small>${formatDate(next.scheduledDate)}</small>` : "No pending activity"}</td><td>${statusChip(personStatus(person, data))}</td><td><a class="row-action" href="#/beneficiaries/${encodeURIComponent(person.id)}">View history →</a></td></tr>`;
    }).join("")}</tbody></table></div></section>`;
}
function childView() {
  const data = store.getState();
  const children = data.beneficiaries.filter(person => person.category === "Child" && !person.archivedAt);
  return `${pageHeading("Child Growth & Nutrition", "Review recorded observations and scheduled monitoring activities.", "CHILD MONITORING")}
    <div class="data-disclaimer"><span aria-hidden="true">ⓘ</span>Recorded values are historical observations, not diagnoses. No unverified growth classifications or treatment recommendations are generated.</div>
    <section class="panel"><div class="table-summary"><strong>${children.length} child records</strong><span>Follow-up history and administrative monitoring</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Child</th><th>Age group</th><th>Assigned worker</th><th>Latest recorded activity</th><th>Next scheduled activity</th><th>Status</th><th>Record</th></tr></thead><tbody>${children.map(person => {
      const acts = activitiesFor(person.id, data).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
      const next = acts.find(activity => activityStatus(activity) !== "Completed");
      const last = acts.find(activity => activityStatus(activity) === "Completed");
      return `<tr><td><a class="person-link" href="#/beneficiaries/${encodeURIComponent(person.id)}"><strong>${esc(person.displayName)}</strong><small>${esc(person.id)}</small></a></td><td>${esc(person.ageGroup)}</td><td>${esc(workerName(person.assignedWorkerId, data))}</td><td>${last ? `${esc(last.activityType)}<small>${formatDate(last.completedAt)}</small>` : "No completed entry"}</td><td>${next ? `${esc(next.activityType)}<small>${formatDate(next.scheduledDate)}</small>` : "None"}</td><td>${statusChip(personStatus(person, data))}</td><td><a class="row-action" href="#/beneficiaries/${encodeURIComponent(person.id)}">View profile →</a></td></tr>`;
    }).join("")}</tbody></table></div></section>
    <section class="panel info-panel"><h2>About recorded measurements</h2><p>This prototype organizes scheduled nutrition and growth follow-ups. It does not store or interpret clinical measurements. Production use would require verified standards and professional oversight.</p></section>`;
}
function reportsView(params) {
  const data = store.getState();
  const filters = { from: params.get("from") || "", to: params.get("to") || "", type: params.get("type") || "", worker: params.get("worker") || "", status: params.get("status") || "" };
  const filtered = currentActivities(data).filter(activity => (!filters.from || activity.scheduledDate >= filters.from) && (!filters.to || activity.scheduledDate <= filters.to) && (!filters.type || activity.activityType === filters.type) && (!filters.worker || activity.assignedWorkerId === filters.worker) && (!filters.status || activityStatus(activity) === filters.status));
  const completed = filtered.filter(activity => activityStatus(activity) === "Completed").length;
  const pending = filtered.length - completed;
  const overdue = filtered.filter(activity => activityStatus(activity) === "Overdue").length;
  const categoryCounts = categories.map(category => ({ name: category, count: data.beneficiaries.filter(person => person.category === category && !person.archivedAt).length }));
  const maxCategory = Math.max(1, ...categoryCounts.map(item => item.count));
  const total = filtered.length || 1;
  const weekCounts = Array.from({ length: 6 }, (_, index) => {
    const start = dateOffset(-35 + index * 7);
    const end = dateOffset(-29 + index * 7);
    const count = currentActivities(data).filter(activity => activity.scheduledDate >= start && activity.scheduledDate <= end).length;
    return { label: formatDate(start, { day: "numeric", month: "short" }), count };
  });
  const maxWeek = Math.max(1, ...weekCounts.map(item => item.count));
  return `${pageHeading("Reports & Analytics", "Understand activity completion and pending work.")}
    <section class="panel report-filters"><form id="report-filters" class="filter-toolbar"><label class="date-field">From<input type="date" name="from" value="${esc(filters.from)}"></label><label class="date-field">To<input type="date" name="to" value="${esc(filters.to)}"></label><label class="select-field"><span class="sr-only">Filter by activity type</span><select name="type"><option value="">All activity types</option>${[...new Set(currentActivities(data).map(item => item.activityType))].map(type => `<option ${filters.type === type ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label><label class="select-field"><span class="sr-only">Filter by worker</span><select name="worker"><option value="">All workers</option>${data.workers.map(worker => `<option value="${esc(worker.id)}" ${filters.worker === worker.id ? "selected" : ""}>${esc(worker.name)}</option>`).join("")}</select></label><label class="select-field"><span class="sr-only">Filter by status</span><select name="status"><option value="">All statuses</option>${["Overdue", "Due Today", "Due This Week", "Upcoming", "Completed"].map(status => `<option ${filters.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><button class="button button-primary" type="submit">Apply filters</button><button class="button button-quiet" type="button" data-action="clear-report-filters">Clear</button></form></section>
    <div class="report-actions"><div><span class="eyebrow">SYNTHETIC OPERATIONAL DATA</span><strong>Report period: ${filters.from || filters.to ? `${filters.from ? formatDate(filters.from) : "Start not set"} – ${filters.to ? formatDate(filters.to) : "End not set"}` : "All scheduled dates"}</strong></div><div><button class="button button-secondary" data-action="export-csv">↓ Export CSV</button><button class="button button-secondary" data-action="print">▤ Print report</button></div></div>
    <div class="metrics-grid report-metrics"><div class="metric-card static-metric"><span class="metric-icon">♙</span><span class="metric-label">Total beneficiaries</span><strong>${data.beneficiaries.filter(person => !person.archivedAt).length}</strong><span class="metric-caption">In this demo workspace</span></div><div class="metric-card static-metric"><span class="metric-icon">✓</span><span class="metric-label">Follow-ups completed</span><strong>${completed}</strong><span class="metric-caption">For selected filters</span></div><div class="metric-card static-metric"><span class="metric-icon">↻</span><span class="metric-label">Pending follow-ups</span><strong>${pending}</strong><span class="metric-caption">For selected filters</span></div><div class="metric-card static-metric"><span class="metric-icon">◷</span><span class="metric-label">Overdue activities</span><strong>${overdue}</strong><span class="metric-caption">For selected filters</span></div></div>
    <div class="reports-grid"><section class="panel"><div class="panel-heading"><div><div class="eyebrow">CURRENT FILTER</div><h2>Completed vs pending</h2></div></div><div class="donut-wrap"><div class="donut-chart" role="img" aria-label="${completed} completed and ${pending} pending activities" style="${filtered.length ? `--done:${completed / total * 100}%` : "background:#e2e8f0"}"><div><strong>${filtered.length}</strong><small>activities</small></div></div><div class="chart-legend"><span><i class="legend-green"></i>Completed <strong>${completed}</strong></span><span><i class="legend-amber"></i>Pending <strong>${pending}</strong></span><small>Overdue ${overdue} of pending</small></div></div></section>
    <section class="panel"><div class="panel-heading"><div><div class="eyebrow">SIX-WEEK OVERVIEW</div><h2>Scheduled activity volume</h2></div></div><div class="bar-chart">${weekCounts.map(item => `<div class="chart-column"><span class="chart-value">${item.count}</span><span class="chart-bar" style="height:${Math.max(4, item.count / maxWeek * 100)}%"></span><small>${item.label}</small></div>`).join("")}</div></section>
    <section class="panel"><div class="panel-heading"><div><div class="eyebrow">COMMUNITY OVERVIEW</div><h2>Beneficiary categories</h2></div></div><div class="population-bars">${categoryCounts.map(item => `<div class="population-row"><div><span>${esc(item.name)}</span><strong>${item.count}</strong></div><span class="bar-track"><span class="bar-fill" style="width:${item.count / maxCategory * 100}%"></span></span></div>`).join("")}</div></section>
    <section class="panel report-table-panel"><div class="panel-heading"><div><div class="eyebrow">SELECTED ACTIVITIES</div><h2>Activity detail</h2></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Beneficiary</th><th>Activity</th><th>Worker</th><th>Due date</th><th>Status</th></tr></thead><tbody>${filtered.map(activity => `<tr><td>${esc(personName(activity.beneficiaryId, data))}<small>${esc(activity.beneficiaryId)}</small></td><td>${esc(activity.activityType)}</td><td>${esc(workerName(activity.assignedWorkerId, data))}</td><td>${formatDate(activity.scheduledDate)}</td><td>${statusChip(activityStatus(activity))}</td></tr>`).join("")}</tbody></table>${filtered.length ? "" : `<p class="muted table-note">No activities for this filter.</p>`}</div></section></div>`;
}
function supervisorView(activeFilters) {
  const totals = supervisorDemo.reduce((sum, worker) => ({ beneficiaries: sum.beneficiaries + worker.beneficiaries, pending: sum.pending + worker.pending, overdue: sum.overdue + worker.overdue }), { beneficiaries: 0, pending: 0, overdue: 0 });
  const query = activeFilters.worker || "";
  const workers = supervisorDemo.filter(worker => !query || worker.id === query);
  const weeklyCompletions = [28, 34, 31, 39, 36, 42].map((count, index) => {
    const start = dateOffset(-35 + index * 7);
    const end = dateOffset(-29 + index * 7);
    return { start, end, count };
  }).filter(week => (!activeFilters.from || week.end >= activeFilters.from) && (!activeFilters.to || week.start <= activeFilters.to));
  const maxCompletions = Math.max(1, ...weeklyCompletions.map(week => week.count));
  return `${pageHeading("Supervisor Overview", "Monitor community programme activity and follow-up completion.", "SUPERVISOR WORKSPACE")}
    <div class="data-disclaimer"><span aria-hidden="true">ⓘ</span>Separate fictional aggregate dataset for interface demonstration. It is not connected to worker records or live programme reporting.</div>
    <div class="metrics-grid supervisor-metrics"><div class="metric-card static-metric"><span class="metric-icon">♙</span><span class="metric-label">Workers</span><strong>12</strong><span class="metric-caption">Fictional demo team</span></div><div class="metric-card static-metric"><span class="metric-icon">▦</span><span class="metric-label">Beneficiaries</span><strong>${totals.beneficiaries.toLocaleString("en-IN")}</strong><span class="metric-caption">Aggregate demo only</span></div><div class="metric-card static-metric"><span class="metric-icon">↻</span><span class="metric-label">Pending follow-ups</span><strong>${totals.pending}</strong><span class="metric-caption">Across demo team</span></div><div class="metric-card static-metric"><span class="metric-icon">◷</span><span class="metric-label">Overdue activities</span><strong>${totals.overdue}</strong><span class="metric-caption">Across demo team</span></div></div>
    <section class="panel supervisor-panel"><div class="panel-heading"><div><div class="eyebrow">WORKER ACTIVITY SUMMARY</div><h2>Community team</h2></div></div>
    <form id="supervisor-filters" class="filter-toolbar"><label class="select-field"><span class="sr-only">Filter supervisor view by worker</span><select name="worker"><option value="">All workers</option>${supervisorDemo.map(worker => `<option value="${worker.id}" ${query === worker.id ? "selected" : ""}>${esc(worker.name)}</option>`).join("")}</select></label><label class="date-field">From<input type="date" name="from" value="${esc(activeFilters.from || "")}"></label><label class="date-field">To<input type="date" name="to" value="${esc(activeFilters.to || "")}"></label><button class="button button-primary" type="submit">Apply filters</button><button class="button button-quiet" type="button" data-action="clear-supervisor-filters">Clear</button></form>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>Worker</th><th>Demo beneficiaries</th><th>Pending follow-ups</th><th>Overdue</th><th>Completion overview</th><th>Summary</th></tr></thead><tbody>${workers.map(worker => `<tr><td><strong>${esc(worker.name)}</strong><small>Fictional worker record</small></td><td>${worker.beneficiaries}</td><td>${worker.pending}</td><td>${worker.overdue}</td><td><div class="mini-progress" aria-label="Illustrative completion level"><span style="width:${Math.round((1 - worker.pending / Math.max(1, worker.beneficiaries)) * 100)}%"></span></div><small>Illustrative activity summary</small></td><td><button class="row-action" type="button" data-action="worker-summary" data-id="${worker.id}">View summary →</button></td></tr>`).join("")}</tbody></table>${workers.length ? "" : emptyState("No worker data", "There are no aggregate demo workers to show.")}</div></section>
    <section class="panel supervisor-trend"><div class="panel-heading"><div><div class="eyebrow">ILLUSTRATIVE TEAM ACTIVITY</div><h2>Weekly completion trend</h2></div></div>${weeklyCompletions.length ? `<div class="bar-chart">${weeklyCompletions.map(week => `<div class="chart-column"><span class="chart-value">${week.count}</span><span class="chart-bar" style="height:${Math.max(4, week.count / maxCompletions * 100)}%"></span><small>${formatDate(week.start, { day: "numeric", month: "short" })}</small></div>`).join("")}</div>` : emptyState("No activity in this date range", "Choose a wider date range to see the illustrative team trend.")}</section>
    <p class="table-note">Supervisor role visibility in this prototype is a frontend demonstration only. Production access must be enforced and audited by a backend.</p>`;
}
export function renderPage(route, role, activeFilters, userName) {
  if (route.page === "beneficiaries" && route.id) return profileView(decodeURIComponent(route.id));
  if (route.page === "dashboard") return dashboardView(userName);
  if (route.page === "beneficiaries") return beneficiaryView(route.params);
  if (route.page === "action-center") return actionCenterView();
  if (route.page === "follow-ups") return followupsView(route.params);
  if (route.page === "immunization") return immunizationView();
  if (route.page === "maternal") return maternalView();
  if (route.page === "child") return childView();
  if (route.page === "reports") return reportsView(route.params);
  if (route.page === "supervisor") return role === "supervisor" ? supervisorView(activeFilters) : `<section class="panel access-denied">${emptyState("Supervisor access only", "Switch to the supervisor demo role to open this view.")}<button class="button button-primary" data-action="logout">Exit demo</button></section>`;
  return `<section class="panel">${emptyState("Page not found", "Choose a page from the navigation to continue.")}<a class="button button-primary" href="#/dashboard">Go to dashboard</a></section>`;
}

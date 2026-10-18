import { createDemoData } from "./demo-data.js";
import { parseLocalDate } from "./date-utils.js";

const STORAGE_KEY = "chaa-demo-state-v1";
let state;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validState(value) {
  if (!value || !["workers", "beneficiaries", "activities", "immunizations", "notifications", "audit"].every(key => Array.isArray(value[key]))) return false;
  const uniqueIds = list => list.every(item => typeof item.id === "string" && item.id) && new Set(list.map(item => item.id)).size === list.length;
  if (!uniqueIds(value.workers) || !uniqueIds(value.beneficiaries) || !uniqueIds(value.activities) || !uniqueIds(value.immunizations) || !uniqueIds(value.notifications)) return false;
  const beneficiaryIds = new Set(value.beneficiaries.map(person => person.id));
  const workerIds = new Set(value.workers.map(worker => worker.id));
  return value.activities.every(activity => beneficiaryIds.has(activity.beneficiaryId) &&
      workerIds.has(activity.assignedWorkerId) && parseLocalDate(activity.scheduledDate) &&
      ["pending", "completed"].includes(activity.status) &&
      (!activity.completedAt || parseLocalDate(activity.completedAt))) &&
    value.immunizations.every(record => beneficiaryIds.has(record.beneficiaryId));
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDemoData();
    const parsed = JSON.parse(saved);
    if (validState(parsed)) return parsed;
    console.error("CHAA demo storage has an invalid shape. Starting with synthetic demo data.");
  } catch (error) {
    console.error("Could not read CHAA demo storage. Starting with synthetic demo data.", error);
  }
  return createDemoData();
}

state = load();

function commit(change) {
  const candidate = clone(state);
  change(candidate);
  if (!validState(candidate)) throw new Error("The demo update did not pass data validation.");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
  state = candidate;
  return clone(state);
}

export const store = {
  getState: () => clone(state),
  reset: () => {
    const fresh = createDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    state = fresh;
  },
  addBeneficiary: (beneficiary, activity) => commit(data => {
    if (data.beneficiaries.some(item => item.id.toLowerCase() === beneficiary.id.toLowerCase())) {
      throw new Error("That demo ID is already in use.");
    }
    data.beneficiaries.unshift(beneficiary);
    if (activity) data.activities.push({
      id: makeId("ACT"),
      beneficiaryId: beneficiary.id,
      activityType: activity.activityType,
      scheduledDate: activity.scheduledDate,
      status: "pending",
      assignedWorkerId: activity.assignedWorkerId,
      completedAt: null,
      history: [],
      nonSensitiveNote: ""
    });
    data.notifications.unshift({ id: makeId("N"), type: "Record successfully updated", message: "A synthetic beneficiary record was added.", relatedEntityId: beneficiary.id, createdAt: new Date().toISOString(), isRead: false });
  }),
  updateBeneficiary: (id, updates) => commit(data => {
    const item = data.beneficiaries.find(person => person.id === id);
    if (!item) throw new Error("Beneficiary record could not be found.");
    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    data.activities.filter(activity => activity.beneficiaryId === id).forEach(activity => {
      activity.assignedWorkerId = updates.assignedWorkerId;
    });
    data.notifications.unshift({ id: makeId("N"), type: "Record successfully updated", message: "A synthetic beneficiary record was updated.", relatedEntityId: id, createdAt: new Date().toISOString(), isRead: false });
  }),
  updateActivity: (id, updates) => commit(data => {
    const item = data.activities.find(activity => activity.id === id);
    if (!item) throw new Error("Activity could not be found.");
    Object.assign(item, updates);
  }),
  addActivity: (beneficiaryId, activityType, scheduledDate, assignedWorkerId) => commit(data => {
    if (!data.beneficiaries.some(person => person.id === beneficiaryId)) throw new Error("Beneficiary record could not be found.");
    data.activities.push({
      id: makeId("ACT"),
      beneficiaryId,
      activityType,
      scheduledDate,
      status: "pending",
      assignedWorkerId,
      completedAt: null,
      history: [],
      nonSensitiveNote: ""
    });
  }),
  completeActivity: (id, completion) => commit(data => {
    const item = data.activities.find(activity => activity.id === id);
    if (!item) throw new Error("Activity could not be found.");
    if (item.completedAt) throw new Error("This activity is already completed.");
    item.completedAt = completion.date;
    item.status = "completed";
    item.nonSensitiveNote = completion.note;
    item.history.push({ type: "completed", date: completion.date, note: completion.note || "Completed during demo follow-up" });
    data.audit.unshift({ activityId: id, type: "completed", date: completion.date, note: completion.note });
    data.notifications.unshift({ id: makeId("N"), type: "Activity completed", message: `${item.activityType} marked complete.`, relatedEntityId: id, createdAt: new Date().toISOString(), isRead: false });
  }),
  rescheduleActivity: (id, newDate, reason) => commit(data => {
    const item = data.activities.find(activity => activity.id === id);
    if (!item) throw new Error("Activity could not be found.");
    if (item.completedAt) throw new Error("Completed activities cannot be rescheduled.");
    const oldDate = item.scheduledDate;
    item.history.push({ type: "rescheduled", date: newDate, from: oldDate, note: reason });
    item.scheduledDate = newDate;
    data.audit.unshift({ activityId: id, type: "rescheduled", date: newDate, from: oldDate, note: reason });
    data.notifications.unshift({ id: makeId("N"), type: "Rescheduled activity", message: `${item.activityType} rescheduled.`, relatedEntityId: id, createdAt: new Date().toISOString(), isRead: false });
  }),
  updateImmunization: (id, record) => commit(data => {
    const item = data.immunizations.find(entry => entry.id === id);
    if (!item) throw new Error("Immunization record could not be found.");
    Object.assign(item, record);
  }),
  markNotificationRead: id => commit(data => {
    const item = data.notifications.find(notification => notification.id === id);
    if (item) item.isRead = true;
  }),
  markAllNotificationsRead: () => commit(data => data.notifications.forEach(item => { item.isRead = true; }))
};

export const makeId = prefix => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

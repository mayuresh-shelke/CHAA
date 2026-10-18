import { dateOffset, localDate } from "./date-utils.js";

export function createDemoData() {
  const workers = [
    { id: "w-asha-01", name: "Meera Joshi", role: "asha", area: "Ward 4 · Nandgaon", active: true },
    { id: "w-anganwadi-01", name: "Kavita Deshmukh", role: "anganwadi", area: "Centre 2 · Nandgaon", active: true },
    { id: "w-asha-02", name: "Farah Shaikh", role: "asha", area: "Ward 6 · Nandgaon", active: true }
  ];
  const beneficiaries = [
    { id: "CH-1042", displayName: "Aarav Patil", category: "Child", ageGroup: "2–5 years", assignedWorkerId: workers[0].id, notes: "Demo record", createdAt: localDate() },
    { id: "CH-1038", displayName: "Priya Sharma", category: "Pregnant Woman", ageGroup: "Adult", assignedWorkerId: workers[0].id, notes: "", createdAt: localDate() },
    { id: "CH-1029", displayName: "Sita More", category: "Lactating Mother", ageGroup: "Adult", assignedWorkerId: workers[1].id, notes: "", createdAt: localDate() },
    { id: "CH-1017", displayName: "Riya Khan", category: "Child", ageGroup: "0–2 years", assignedWorkerId: workers[2].id, notes: "", createdAt: localDate() },
    { id: "CH-1046", displayName: "Anaya Kulkarni", category: "Child", ageGroup: "2–5 years", assignedWorkerId: workers[1].id, notes: "", createdAt: localDate() },
    { id: "CH-1008", displayName: "Neha Pawar", category: "Pregnant Woman", ageGroup: "Adult", assignedWorkerId: workers[2].id, notes: "", createdAt: localDate() },
    { id: "CH-1033", displayName: "Dev Jadhav", category: "Child", ageGroup: "2–5 years", assignedWorkerId: workers[0].id, notes: "", createdAt: localDate() },
    { id: "CH-1021", displayName: "Asha Bhosale", category: "Other Beneficiary", ageGroup: "Adult", assignedWorkerId: workers[1].id, notes: "", createdAt: localDate() },
    { id: "CH-1051", displayName: "Ishaan Patil", category: "Child", ageGroup: "0–2 years", assignedWorkerId: workers[2].id, notes: "", createdAt: localDate() },
    { id: "CH-1012", displayName: "Pooja Gawande", category: "Lactating Mother", ageGroup: "Adult", assignedWorkerId: workers[0].id, notes: "", createdAt: localDate() }
  ];
  const activitySpecs = [
    ["CH-1042", "Growth monitoring", -3],
    ["CH-1038", "Maternal follow-up", 0],
    ["CH-1029", "Follow-up visit", -1],
    ["CH-1017", "Immunization follow-up", 0],
    ["CH-1046", "Growth monitoring", 2],
    ["CH-1008", "Maternal follow-up", 4],
    ["CH-1033", "Nutrition monitoring", 6],
    ["CH-1021", "Routine follow-up", 10],
    ["CH-1051", "Immunization follow-up", 14],
    ["CH-1012", "Postpartum follow-up", -5],
    ["CH-1042", "Nutrition monitoring", -8],
    ["CH-1038", "Maternal follow-up", -12, true],
    ["CH-1017", "Growth monitoring", -16, true],
    ["CH-1046", "Immunization follow-up", -20, true],
    ["CH-1008", "Maternal follow-up", -24, true],
    ["CH-1033", "Growth monitoring", -30, true],
    ["CH-1021", "Routine follow-up", -35, true],
    ["CH-1051", "Growth monitoring", -40, true]
  ];
  const activities = activitySpecs.map(([beneficiaryId, activityType, offset, complete], index) => ({
    id: `ACT-${String(index + 1).padStart(3, "0")}`,
    beneficiaryId,
    activityType,
    scheduledDate: dateOffset(offset),
    status: complete ? "completed" : "pending",
    assignedWorkerId: beneficiaries.find(person => person.id === beneficiaryId).assignedWorkerId,
    completedAt: complete ? dateOffset(offset) : null,
    history: complete ? [{ type: "completed", date: dateOffset(offset), note: "Demo activity recorded" }] : [],
    nonSensitiveNote: ""
  }));
  const immunizations = [
    { id: "IMM-01", beneficiaryId: "CH-1042", activityName: "Illustrative scheduled follow-up", status: "Scheduled", recordedDate: "", dueDate: dateOffset(-3), note: "" },
    { id: "IMM-02", beneficiaryId: "CH-1017", activityName: "Illustrative scheduled follow-up", status: "Scheduled", recordedDate: "", dueDate: dateOffset(0), note: "" },
    { id: "IMM-03", beneficiaryId: "CH-1046", activityName: "Recorded demo milestone", status: "Completed", recordedDate: dateOffset(-60), dueDate: "", note: "Synthetic demonstration entry" },
    { id: "IMM-04", beneficiaryId: "CH-1051", activityName: "Illustrative scheduled follow-up", status: "Scheduled", recordedDate: "", dueDate: dateOffset(14), note: "" }
  ];
  const notifications = [
    { id: "N-01", type: "Overdue activity", message: "A growth monitoring activity is overdue.", relatedEntityId: "ACT-001", createdAt: new Date().toISOString(), isRead: false },
    { id: "N-02", type: "Due today", message: "A maternal follow-up is due today.", relatedEntityId: "ACT-002", createdAt: new Date().toISOString(), isRead: false }
  ];
  return { workers, beneficiaries, activities, immunizations, notifications, audit: [] };
}

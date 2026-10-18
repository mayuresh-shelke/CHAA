# CHAA — Community Health Action Assistant

CHAA is a responsive, vanilla HTML/CSS/JavaScript prototype for organizing community-health follow-ups. It helps demo users move from synthetic records to an ordered work queue; it is not a clinical decision-support tool.

## Features

- Demo login for ASHA Worker, Anganwadi Worker, and Supervisor roles.
- Responsive dashboard, beneficiary directory and profiles, Action Center, and follow-up queue.
- Add/edit/archive beneficiary demo records and update the next administrative activity.
- Complete activities or reschedule them with a retained history entry.
- Maternal follow-up and child growth/nutrition organization views.
- Illustrative immunization record tracking without an authoritative schedule or dose recommendations.
- Reports derived from the same worker demo data, date/activity/worker filters, safe CSV export, and print styles.
- Separate, explicitly fictional supervisor aggregate dataset.
- In-app notifications, browser LocalStorage persistence, and confirmed reset to seed data.
- Accessible labels, keyboard-operable controls, visible focus styles, status text, reduced-motion support, and responsive layouts.

## Folder structure

```text
.
├── index.html
├── README.md
├── assets/
│   └── logo.svg
├── css/
│   └── styles.css
└── js/
    ├── app.js
    ├── date-utils.js
    ├── demo-data.js
    ├── store.js
    ├── utils.js
    └── views.js
```

## Run locally

Serve this folder with any static HTTP server, then open its local URL. For example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. ES modules need to be served over HTTP; opening `index.html` directly as a `file:` URL may be blocked by the browser.

## Demo roles and access

On the demo login screen, enter any display name (two or more characters) and select a role. No password, PIN, government identifier, or real personal information is needed. The role selector changes the demo identity and supervisor-view visibility. This is frontend-only demonstration behavior—not authentication or authorization suitable for production.

All beneficiary names, workers, activities, schedules, and notes in the initial dataset are synthetic. The dashboard totals are computed from that smaller dataset; they are intentionally not the illustrative 128/3/5/7 figures from the project brief.

## Data and persistence

`js/demo-data.js` creates the starting synthetic data. `js/store.js` validates and updates the shared state and saves it under `chaa-demo-state-v1` in browser LocalStorage. Login session identity is held in session storage and is cleared by “Exit demo.” “Reset demo data” restores the synthetic seed after confirmation. The data stays in that browser profile; the offline indicator does not mean that records synchronize with a server.

The Action Center derives activity priority from local calendar dates:

- Completed timestamp → Completed
- Earlier than today → Overdue
- Today → Due Today
- Within the next seven calendar days → Due This Week
- Later → Upcoming

## Safety and known limitations

- This prototype only supports administrative scheduling and record organization. It does not diagnose, prescribe, score clinical risk, or make health decisions.
- Maternal schedules and immunization milestones are illustrative. Any real schedule must be verified by qualified programme authorities against current official guidance.
- No backend, secure authentication, server-enforced roles, encryption, audit service, clinical data integration, official government integration, SMS/WhatsApp/email/push delivery, background reminder service, or production synchronization is implemented.
- Browser storage is not appropriate for real patient or production health data. Use synthetic demo content only.
- The supervisor workspace uses a separate fictional aggregate dataset and is not live data.
- A service worker and conflict-safe offline synchronization are not implemented.

## Proposed production architecture

Production deployment needs a secured, audited backend API and database; server-side role/area authorization; encrypted transport and storage; explicit consent and privacy governance; a verified and versioned programme-rule service; server-issued reminder integrations; and an offline client with encrypted local storage, queued writes, conflict resolution, and observable sync status. Clinical content and schedules need review and approval by qualified programme authorities before deployment.

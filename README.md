# MediFlow Pharmacy — working MVP

This is a runnable full-stack pharmacy stock and sales management MVP, not just a dashboard mockup.

## Included
- Vue 3 + Vite frontend
- Express API backend
- SQLite database (created automatically on first backend start)
- Medicines CRUD, stock batches, low-stock/expiry alerts, sales, dashboard summaries
- Basic login with seeded demo users, bcrypt password hashes, session cookies
- Input validation, API error handling, and stock updates inside database transactions

> This is an MVP foundation, not a certified production system. Before using it with real pharmacy operations, get a security review, configure HTTPS and backups, and verify Rwanda's applicable business, pharmacy, and data-protection requirements. Do not store patient or clinical data in this version.

## Requirements
- Node.js 20+ (Node 24 should work)
- npm

## Start it
Open two terminal windows from this folder.

### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
The API starts at `http://localhost:4000`. SQLite database is created at `backend/data/mediflow.sqlite`.

### 2. Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints, usually `http://localhost:5173`.

## Demo login
- Owner: `owner@mediflow.local`
- Pharmacist: `pharmacist@mediflow.local`
- Password for both: `ChangeMe123!`

Change these credentials and `SESSION_SECRET` before any real deployment. Demo users are created only when the database is first initialized.

## Useful commands
Backend:
- `npm run dev` — development server
- `npm start` — normal server start

Frontend:
- `npm run dev` — development server
- `npm run build` — production build

## Important notes
- `npm install` downloads exact versions from the package manifests/lockfiles. `node_modules` is not bundled because it is platform-specific and very large.
- The API currently uses SQLite so it starts locally without a separate database server. For a multi-pharmacy production deployment, plan a PostgreSQL migration and proper tenant isolation before onboarding real customers.

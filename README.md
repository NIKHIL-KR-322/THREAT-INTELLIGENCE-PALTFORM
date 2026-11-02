# Threat Intel Platform

A beginner-friendly cybersecurity class project. It keeps company assets and scan results in **MySQL**, sample threat reports in **MongoDB**, then compares the records and explains the risk score. Its live web check makes one read-only HTTP request to `/` on a registered private IP at port 4173. It checks visible response headers, cookies, and a simple directory-listing pattern. It does not exploit vulnerabilities, discover ports, authenticate, crawl links, or verify CVEs. Scan only systems you own or have explicit permission to assess. Seeded historical simulation data may also appear.

## What the app does

- Sign users in with a password hash and an HTTP-only session cookie.
- Add company assets and vulnerability (CVE) records.
- Link a vulnerability to an asset and track the review status.
- Run a limited, read-only live HTTP configuration check against a registered private IP and save its report in MongoDB.
- Compare finding CVEs with sample MongoDB threat reports and create an alert for an exact match.
- Update alert and ticket status, add investigation notes, and review analytics or export a CSV.
- Open an asset-wise report from the Reports table, review its saved scans/findings/correlations/alerts/tickets, and export that asset's records as CSV.
- Manage users as an administrator and check the two database connections.

## You need these programs running

- Node.js 20.9 or later. This computer has Node 26 and npm 11.
- MySQL Server 8. The MySQL Workbench app is present, but a MySQL command-line client/server was not found during the environment check.
- MongoDB Server. MongoDB Shell is present, but `mongod` (the database server) was not found.

Workbench and MongoDB Shell are database clients/tools; the actual database server programs must be installed and running before the app can create databases.

## First-time setup (PowerShell)

Open PowerShell in this project folder:

```powershell
cd "$HOME\OneDrive\Desktop\DBMS-PROJ"
Copy-Item .env.example .env
```

Open `.env` in a text editor and enter your local MySQL username/password. Keep both database names exactly `threat_intel_platform_v2`. Create a long session secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy that output into `SESSION_SECRET` in `.env`. Do not share your `.env` file.

Start the MySQL and MongoDB **server** programs. Then run:

```powershell
npm install
npm run db:create
npm run db:migrate
npm run db:seed
npm run db:verify
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Sign in with one of the local demo accounts below. `db:create` and all seed/migration scripts stop unless the configured database names are exactly `threat_intel_platform_v2`. Nothing imports, drops, or resets an older database. `db:seed` can be run more than once without duplicating the demo records. Start the local demo web server in another terminal with `npm run demo:server`.

## Demo sign-in

These are for a local classroom demo only:

- Administrator: `admin@demo.local` / `DemoAdmin!2026`
- Analyst: `analyst@demo.local` / `DemoAnalyst!2026`

## How to use the website

1. **Add a live demo asset** named `LOCAL-WEB-DEMO`, type `Web Server`, IP `127.0.0.1`, criticality `Medium`. The seeded `WEB-SERVER-01` is historical sample data and points to a placeholder address.
2. **Add a known vulnerability** such as `CVE-2021-44228` (Log4Shell).
3. **Link the vulnerability to an asset** with status `Unverified`. A CVE record alone does not prove an asset is affected.
4. **Run a live web configuration check.** With the demo server running, select `LOCAL-WEB-DEMO`; the app requests `http://127.0.0.1:4173/` and reports observed header/cookie configuration gaps.
5. **Review the sample threat report** stored in MongoDB. Seed records are labelled as samples, not live feeds.
6. **Check for a threat match.** Exact CVE matches are saved to MySQL and produce an alert. The page shows each risk formula input.
7. **Review the alert**, update its status, create an investigation ticket, add a note, and view reports.

The dashboard numbers and workflow progress come from database queries. The health page shows MySQL and MongoDB separately. CSV export is available under Reports. The web check does not establish that a specific CVE exists on the target; it reports observable configuration conditions only.

## More commands

```powershell
npm run typecheck
npm run lint
npm run build
npm start
```

The app API uses `/api/health` for a basic database connection check. For production use, replace the development demo passwords and use a private secret.

## Database server note

MySQL Workbench and MongoDB Shell are client tools. Install and start MySQL Server and MongoDB Server before running the `db:*` setup commands above. On Windows, the application can still build without a database, but its live features need both database servers running.

## Preview file

`preview.png` shows the simple dashboard style. `preview.html` and `preview.svg` are static visual previews; the running application uses the React page in `src/app/page.tsx` and shared CSS in `src/app/styles.css`.

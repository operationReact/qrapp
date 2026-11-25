# Local development — IntelliJ IDEA (Windows)

This setup uses the existing production AWS account and does not create a second AWS environment. Java 17, Node.js 22 (22.12+), Git and the Gradle 8.7 wrapper are required. Docker Desktop or a dedicated local PostgreSQL installation is required only for the full local backend.

## Clone or update

Open the repository root as a Gradle project in IntelliJ IDEA, using JDK 17 for the project and Gradle JVM. Set the Node interpreter to Node 22. In the IntelliJ terminal:

```powershell
git switch main
git pull --ff-only origin main
cd frontend
npm ci
cd ..
```

Shared run configurations are under `.run/`. IntelliJ with JavaScript/Node support can select them from the Run dropdown. If your edition does not support the npm configuration type, use the terminal commands below.

## Mode 1: Local frontend + current production APIs

Choose **BroBro Frontend - PROD Read Only** (or **BroBro Frontend - PROD Writes (LIVE DATA)** only if you intend to modify production). Both modes use the existing new-account endpoint:

`https://migrate-prod-api.broandbro.in`

Open http://localhost:5173. Vite proxies `/__prod_api/*` to the HTTPS production endpoint. This keeps the browser same-origin and does not require weakening production CORS or entering AWS/RDS credentials locally. Read-only mode blocks POST, PUT, PATCH, DELETE and other non-read HTTP methods; login and other POST-based actions require the live-write mode. Read-only here describes HTTP methods, not an absolute guarantee about the server's implementation of GET endpoints. The live-write mode is for deliberate production operations only: orders, accounts, wallets, OTPs and other actions may affect actual customers or incur charges. Use a designated test account.

Terminal alternatives (run only one frontend mode at a time):

```powershell
cd frontend
npm run dev:prod-api
# OR, when live writes are intended:
npm run dev:prod-api:write
```

Do not expose the development server on the network. Keep the local proxy prefix; do not replace it with an arbitrary URL. Google sign-in on localhost will additionally require the exact origin `http://localhost:5173` to be authorized in Google Cloud after Google authentication is deployed.

## Mode 2: Local frontend + local Java backend

Start PostgreSQL from the repository root:

```powershell
docker compose -f compose.local.yml up -d --wait
```

Select **BroBro Full Stack - LOCAL** to start both processes, or run **BroBro Backend - LOCAL** and **BroBro Frontend - LOCAL** individually. Debug the Java configuration to use breakpoints. The backend starts at http://localhost:8080 and the UI at http://localhost:5173. On first startup Flyway initializes the dedicated local database.

Terminal alternative, from the root:

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"
$env:SPRING_CLOUD_AWS_PARAMETERSTORE_ENABLED = "false"
$env:AWS_REGION = "ap-south-1"
$env:AWS_EC2_METADATA_DISABLED = "true"
.\gradlew.bat :backend:bootRun
```

In a second terminal:

```powershell
cd frontend
npm run dev:local
```

Local database settings: host localhost, port 5432, database and username `broandbro_local`, password `brobro-local-only` (disposable local credential only). Docker binds the database to loopback. If using a locally installed PostgreSQL server, create that same dedicated database and user. Do not use a port-forward to production RDS. The startup guard refuses a nonlocal datasource, mixed profiles, enabled cloud providers or configured external-provider credentials in local mode. Local WhatsApp, payments, S3 and AI image generation are disabled; do not expect real OTP/payment delivery from the local backend. The local database is separate from production.

To stop PostgreSQL without removing the local data:

```powershell
docker compose -f compose.local.yml down
```

## Troubleshooting

- Port 5173 already in use: stop the other Vite process and rerun the chosen configuration.
- Port 5432 already in use: stop the conflicting local PostgreSQL container/service or configure that instance with the dedicated database and user.
- Node/Gradle import problems: select Node 22 and JDK 17; use the repository Gradle wrapper.
- Production API GETs work but login returns HTTP 403: the read-only mode intentionally rejects POST; choose the explicitly named live-write mode if authorized.
- An unavailable production endpoint is a remote service issue, not a local database issue.
- Never set `spring.profiles.active=prod` for local backend development or copy production database/payment/provider secrets into this setup.

CI: `Local development validation` checks proxy protections, IntelliJ XML, frontend build, a read-only production API request, local guard tests and startup against fresh PostgreSQL. No production deployment is triggered by these local-only configuration changes.

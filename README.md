# CloudGuard

CloudGuard is a comprehensive full-stack application designed for cloud infrastructure monitoring and management. It provides a robust backend API and a responsive frontend dashboard for visualizing metrics, managing resources, and ensuring system security.

## Project Structure

The project is divided into three main directories:
- **`frontend/`**: The React-based user interface, powered by Vite, TailwindCSS, and React Query.
- **`backend/`**: The Node.js and Express backend API, utilizing Prisma for database ORM and Zod for validation.
- **`design/`**: Contains project design assets and Figma tokens.

## Features

- **Real-time Monitoring**: Track cloud resources and system metrics in real time.
- **Secure Authentication**: JWT-based secure authentication.
- **Data Visualization**: Interactive charts using Recharts.
- **Responsive Dashboard**: A modern UI built with React, Lucide React, and TailwindCSS.
- **Scheduled Jobs**: Background tasks managed via node-cron.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A relational database (PostgreSQL/MySQL) for Prisma

### Backend Setup
1. Navigate to the `backend/` directory: `cd backend`
2. Install dependencies: `npm install`
3. Copy the example env file: `cp .env.example .env` and update the database credentials.
4. Run Prisma migrations: `npm run prisma:migrate`
5. Start the backend development server: `npm run dev`

### Frontend Setup
1. Navigate to the `frontend/` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

## Digital Assignment 3 (DA3) — Scaling, High Availability & Security Hardening

This branch (`assignment-3`) contains the complete implementation for **BACSE344 Digital Assignment 3**, including horizontal scaling, Nginx load balancing, live Neon PostgreSQL connection, failover resilience, TOTP multi-factor authentication, RBAC authorization enforcement, and container security hardening.

### 1. Multi-Instance Architecture & Docker Deployment
The backend runs as three replicas behind an Nginx reverse proxy load balancer:
- **Nginx Ingress**: Port `8080` (forwards to upstream cluster via round-robin)
- **Backend Replicas**: `cloudguard-backend-1` (port 4001), `cloudguard-backend-2` (port 4002), `cloudguard-backend-3` (port 4003)
- **Cloud Database**: Neon Serverless PostgreSQL 18.6 connected over TLS (`sslmode=require`)

#### Running the Multi-Instance Cluster:
```bash
# 1. Ensure backend/.env contains your Neon PostgreSQL connection string
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL, DIRECT_URL, and JWT_SECRET

# 2. Build and launch the 3 backend instances and Nginx load balancer
docker compose --env-file ./backend/.env up -d

# 3. Verify healthy round-robin distribution
curl http://localhost:8080/health
```

### 2. Reproducing Benchmarks & Load Tests
To execute the 1,000-request benchmark against 1 backend vs. 3 backends behind Nginx using `autocannon`:
```bash
# Obtain JWT auth token:
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cloudguard.dev","password":"admin1234"}' | jq -r .token)

# Run benchmark against single backend instance (Port 4001):
npx -y autocannon -a 1000 -c 10 -t 30 -H "Authorization: Bearer $TOKEN" http://localhost:4001/api/resources

# Run benchmark against 3 backend instances behind Nginx (Port 8080):
npx -y autocannon -a 1000 -c 10 -t 30 -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/resources
```

### 3. Reproducing Upstream Failover Testing
To verify zero-downtime failover with resilient Nginx retry directives:
```bash
# Stop one backend instance while traffic is running:
docker stop cloudguard-backend-2

# Send test requests through Nginx:
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/health; done
# All 10 requests return HTTP 200 OK via automatic upstream retry to backend-1 and backend-3.

# Restart the instance:
docker start cloudguard-backend-2
```

### 4. Running Security Verification (MFA & RBAC)
To test TOTP MFA and role-based access control rejections:
```bash
cd backend
npm test
```
- **MFA Setup**: `POST /api/auth/mfa/setup` generates a Base32 secret and QR code data URL.
- **MFA Verify**: `POST /api/auth/mfa/verify` validates the 6-digit TOTP code and activates MFA.
- **RBAC Guards**: Unauthenticated requests to `PATCH /api/resources/:id` or `DELETE /api/resources/:id` return `401 Unauthorized`. Requests by `VIEWER` role return `403 Forbidden`.

### 5. Running Container Vulnerability Scans with Trivy
To reproduce the before-and-after vulnerability scans:
```bash
# 1. Scan baseline unhardened image (40 High, 6 Critical):
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity HIGH,CRITICAL --scanners vuln cloudguard-backend:baseline

# 2. Build and scan hardened multi-stage image (11 High, 1 Critical - 83.3% Critical drop):
docker build -f ./backend/Dockerfile.hardened -t cloudguard-backend:hardened ./backend
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity HIGH,CRITICAL --scanners vuln cloudguard-backend:hardened
```

---

## Technologies Used

### Frontend
- React 18
- Vite
- TailwindCSS
- Zustand
- React Query (@tanstack/react-query)
- React Router DOM
- Recharts
- Zod

### Backend
- Node.js & Express
- Prisma ORM
- JSON Web Tokens (JWT) & bcryptjs
- node-cron
- Pino (Logging)
- Vitest (Testing)

## License

This project is licensed under the MIT License.

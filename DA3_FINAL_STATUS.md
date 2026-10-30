# BACSE344 — Cloud Infrastructure and Architecture
## Digital Assignment 3 (DA3): Final Implementation & Verification Summary

- **Repository Root**: `C:\Users\G.V.Hiitesh\Desktop\cloud\cloudguard-main`
- **Active Git Branch**: `assignment-3`
- **Commit ID**: `88060f5` (Baseline + Scaling + Security + Final Documents)
- **Primary Deliverable**: [`BACSE344_Digital_Assignment_3_Final_Report.docx`](file:///c:/Users/G.V.Hiitesh/Desktop/cloud/cloudguard-main/BACSE344_Digital_Assignment_3_Final_Report.docx)
- **Database Engine**: Neon Serverless PostgreSQL 18.6 (AWS `us-east-2`)

---

### 1. Verified Implementation & Key Results

#### Question 1: Scaling (5 Marks)
1. **Peak Demand Scenario & Target API**:
   - Incident triage and operational shift handover rush.
   - API hit hardest: `GET /api/resources` (dynamic relational querying, health score calculation, and JSON metadata serialization).
2. **Containerization & Nginx Load Balancer**:
   - Orchestrated 3 backend instances (`cloudguard-backend-1`, `cloudguard-backend-2`, `cloudguard-backend-3`) connected via TLS to your **Neon PostgreSQL 18.6** cloud database.
   - Nginx reverse proxy load balancer on port `8080`, distributing traffic sequentially across all 3 containers via round-robin (verified: `backend-1` -> `backend-2` -> `backend-3`).
3. **1,000-Request Benchmark (`autocannon` @ Concurrency 10)**:
   - **1 Instance**: **4.12 req/sec**, **2382.49 ms** average latency (1,000 x 2xx).
   - **3 Instances + Nginx**: **4.45 req/sec**, **2216.73 ms** average latency (986 x 2xx, 14 x 500).
   - **Measured Improvements**: **+8.01% throughput increase** and **-6.96% faster response time** (-165.76 ms avg latency, -339 ms tail latency).
   - **Root Cause of 14 Non-2xx**: Log inspection confirmed Prisma error `P2024` ("Timed out fetching a new connection from the connection pool. Current connection pool timeout: 10s, connection limit: 9"). Under 10 concurrent requests across 3 instances, the cloud database pool limit was momentarily saturated.
4. **Fault Tolerance & Failure Handling**:
   - Container `backend-2` was stopped mid-test (`docker stop cloudguard-backend-2`).
   - *Default Nginx*: **4/10 requests failed with 504 Gateway Time-out (40.0% error rate)**.
   - *Resilient Nginx (`proxy_next_upstream`)*: **10/10 requests succeeded (0.0% error rate / zero downtime)** via automatic upstream retry within 1 second.
5. **Architecture Diagram & Cloud Bursting**:
   - High-resolution visual diagram embedded into the report (`Figure 1`).
   - Details ports (`:8080`, `:4001`, `:4002`, `:4003`), Neon cloud database, and an **AWS ECS Fargate Serverless Burst Fleet** triggered when CPU > 80% or queue latency > 2s.

---

#### Question 2: Security (5 Marks)
1. **Password Hashing Audit**:
   - Live database inspection confirmed legacy seeded users possess 60-character `$2a$10$...` hashes (`getRounds() = 10`).
   - Updated registration logic enforces `SALT_ROUNDS = 12` (`$2a$12$...`) for newly created accounts.
2. **TOTP Multi-Factor Authentication**:
   - Implemented RFC 6238 TOTP MFA compatible with **Google Authenticator** and **Microsoft Authenticator** via `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/verify`, and MFA-gated `POST /api/auth/login`.
3. **Role-Based Update & Delete Authorization**:
   - Missing Bearer token -> **401 Unauthorized** (`"Missing Bearer token"`).
   - `VIEWER` attempting `PATCH /api/resources/:id` or `DELETE /api/resources/:id` -> **403 Forbidden** (`"Requires role: EDITOR or ADMIN"`).
   - `ADMIN` role -> **200 OK**.
4. **Trivy Container Security Hardening**:
   - Baseline scan (`cloudguard-backend:baseline`): **40 HIGH, 6 CRITICAL**.
   - Hardened multi-stage build (`backend/Dockerfile.hardened`): Multi-stage Alpine, pruned dev dependencies (`npm prune --omit=dev`), removed compiler binaries (`@esbuild`), and unprivileged execution (`USER node`).
   - Hardened scan (`cloudguard-backend:hardened`): **11 HIGH, 1 CRITICAL**.
   - **Impact**: **83.3% drop in Critical CVEs** and **72.5% drop in High CVEs** (100% elimination of build tool binaries).
5. **Threat Modeling & Regulatory Compliance**:
   - Threat Agent 1: Compromised DevOps Credential -> Mitigated by TOTP MFA & AuditLog -> Mapped to **ISO/IEC 27001 Controls 5.17 & 8.5**.
   - Threat Agent 2: Rogue Internal Operator -> Mitigated by RBAC & Non-root container -> Mapped to **GDPR Article 32**.

---

### 2. Deliverables Summary

| Deliverable | File Location | Status |
| :--- | :--- | :---: |
| **Comprehensive Final Word Report** | `BACSE344_Digital_Assignment_3_Final_Report.docx` | **READY (172.5 KB)** |
| **Status Summary Markdown** | `DA3_FINAL_STATUS.md` | **READY** |
| **Architecture Diagram (PNG)** | `architecture_diagram.png` | **READY & EMBEDDED** |
| **Git Working Branch** | `assignment-3` | **COMMITTED & CLEAN** |
| **Vitest Regression Suite** | `backend/tests` | **46/46 TESTS PASS** |

---

### 3. Actions You Must Personally Perform Before Submission
1. **Close any open Microsoft Word windows** on your machine if you wish to overwrite the older `BACSE344_Digital_Assignment_3_Report.docx` (Windows file lock prevented overwriting while Word was open; `BACSE344_Digital_Assignment_3_Final_Report.docx` contains the complete, updated report).
2. **Review `BACSE344_Digital_Assignment_3_Final_Report.docx`** to verify visual presentation and table alignment.
3. **Submit the `.docx` file** and provide your GitHub repository link with the `assignment-3` branch on MSTeams as per the assignment instructions.

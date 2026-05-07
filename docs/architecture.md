# paliativeKSP - Complete System Architecture

เอกสารนี้ออกแบบสถาปัตยกรรมทั้งระบบสำหรับ `paliativeKSP` ในรูปแบบที่นำไปใช้ต่อได้จริงกับระบบดูแลผู้ป่วย Palliative Care ระดับโรงพยาบาล/รพ.สต./ทีมเยี่ยมบ้าน

> อ้างอิงต่อยอดจาก `docs/flowchart.md` ซึ่งมี flow หลักของระบบ, patient workflow, DFD, ERD และ API sequence ไว้แล้ว

---

## 1. Architecture Goals

ระบบ `paliativeKSP` ควรถูกออกแบบเพื่อรองรับเป้าหมายหลักดังนี้

1. ลงทะเบียนและติดตามผู้ป่วย Palliative Care
2. บันทึกการประเมิน PPS, ESAS, Pain Score และข้อมูลเยี่ยมบ้าน
3. สนับสนุนการทำงานของทีมสหวิชาชีพ เช่น แพทย์ พยาบาล เจ้าหน้าที่ และผู้ดูแลระบบ
4. เชื่อมโยงข้อมูลจากระบบโรงพยาบาล เช่น HOSxP/HIS ในอนาคต
5. สร้างรายงานสำหรับบริหารจัดการและส่งออก PDF/Excel
6. มีความปลอดภัยด้านข้อมูลสุขภาพและสิทธิ์การเข้าถึง
7. รองรับการพัฒนาเป็น Web App, Mobile App และ API กลาง

---

## 2. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client[Client Layer]
        WEB[Web Browser]
        MOBILE[Mobile App / PWA]
        ADMIN[Admin Console]
    end

    subgraph Edge[Edge / Network Layer]
        DNS[DNS / Domain]
        HTTPS[HTTPS / TLS]
        NGINX[Nginx / Apache Reverse Proxy]
    end

    subgraph App[Application Layer]
        FRONTEND[Frontend UI]
        API[Backend REST API]
        AUTH[Authentication Service]
        REPORT[Report Service]
        FILES[File Upload Service]
        JOBS[Background Jobs]
    end

    subgraph Data[Data Layer]
        DB[(Main Database)]
        STORAGE[(File Storage)]
        CACHE[(Cache / Session Store)]
        LOGS[(Audit Logs)]
    end

    subgraph External[External Integration]
        HOSXP[HOSxP / HIS]
        LINE[LINE Notify / LINE OA]
        EMAIL[Email / SMTP]
        FHIR[FHIR / Health API]
    end

    WEB --> HTTPS
    MOBILE --> HTTPS
    ADMIN --> HTTPS
    HTTPS --> NGINX
    NGINX --> FRONTEND
    FRONTEND --> API

    API --> AUTH
    API --> DB
    API --> STORAGE
    API --> CACHE
    API --> LOGS
    API --> REPORT
    API --> FILES
    API --> JOBS

    JOBS --> HOSXP
    JOBS --> LINE
    JOBS --> EMAIL
    API --> FHIR
```

---

## 3. Recommended Technology Stack

### Option A: PHP / Laravel Stack

เหมาะกับระบบราชการ/โรงพยาบาลที่ต้อง deploy ง่ายบน Linux + Apache/Nginx

```text
Frontend     : Blade / Vue / React
Backend      : Laravel
Database     : MySQL / MariaDB
Auth         : Laravel Sanctum / Session
Queue        : Laravel Queue + Cron
Report       : DomPDF / PhpSpreadsheet
Web Server   : Nginx or Apache
Deployment   : Docker Compose or bare metal Linux
```

### Option B: Node.js / Express / React Stack

เหมาะกับระบบ API-first และต่อ Mobile ได้ง่าย

```text
Frontend     : React / Next.js
Backend      : Node.js + Express / NestJS
Database     : PostgreSQL / MySQL
Auth         : JWT + Refresh Token
Queue        : BullMQ / Redis
Report       : PDFKit / ExcelJS
Web Server   : Nginx Reverse Proxy
Deployment   : Docker Compose / VPS
```

### Option C: Python / FastAPI Stack

เหมาะกับการต่อยอด AI/Analytics/Prediction ในอนาคต

```text
Frontend     : React / Vue
Backend      : FastAPI
Database     : PostgreSQL
Auth         : JWT / OAuth2
Queue        : Celery / Redis
Report       : WeasyPrint / OpenPyXL
Deployment   : Docker Compose / Kubernetes
```

---

## 4. Layered Architecture

```mermaid
flowchart TB
    UI[Presentation Layer\nWeb UI / Mobile UI]
    API[API Layer\nRoutes / Controllers]
    SERVICE[Service Layer\nBusiness Logic]
    DOMAIN[Domain Layer\nPatient / Visit / Assessment / CarePlan]
    REPO[Repository Layer\nDatabase Access]
    DB[(Database)]
    EXT[External Services\nHOSxP / LINE / Email]

    UI --> API
    API --> SERVICE
    SERVICE --> DOMAIN
    SERVICE --> REPO
    REPO --> DB
    SERVICE --> EXT
```

### Responsibility

| Layer | หน้าที่ |
|---|---|
| Presentation | แสดงผล Dashboard, Forms, Patient Profile |
| API | รับ Request, Validate Input, ส่ง Response |
| Service | จัดการ Logic เช่น คำนวณสถานะ, สร้าง Care Plan |
| Domain | โครงสร้างข้อมูลหลัก เช่น Patient, Visit, Assessment |
| Repository | Query/Insert/Update/Delete Database |
| External | เชื่อมระบบภายนอก เช่น HOSxP, LINE, SMTP |

---

## 5. Main Modules

```mermaid
mindmap
  root((paliativeKSP))
    User Management
      Login
      Role Permission
      Audit Log
    Patient Registry
      Register Patient
      Patient Profile
      Palliative Status
    Assessment
      PPS
      ESAS
      Pain Score
      ADL
    Care Plan
      Problem List
      Goal
      Intervention
      Follow Up
    Home Visit
      Visit Schedule
      Visit Record
      Photo/Document
    Appointment
      Calendar
      Reminder
      Status Tracking
    Report
      Dashboard
      PDF
      Excel
    Integration
      HOSxP
      FHIR
      LINE Notify
```

---

## 6. User Roles and Permission Model

```mermaid
flowchart LR
    ADMIN[Admin]
    DOCTOR[Doctor]
    NURSE[Nurse / Home Visit Team]
    STAFF[Staff]
    VIEWER[Viewer / Executive]

    ADMIN --> A1[Manage Users]
    ADMIN --> A2[Manage Master Data]
    ADMIN --> A3[View All Reports]

    DOCTOR --> D1[View Patient]
    DOCTOR --> D2[Assessment]
    DOCTOR --> D3[Care Plan]
    DOCTOR --> D4[Medication / Treatment]

    NURSE --> N1[Home Visit]
    NURSE --> N2[Symptom Record]
    NURSE --> N3[Follow-up]

    STAFF --> S1[Register Patient]
    STAFF --> S2[Appointment]
    STAFF --> S3[Document Upload]

    VIEWER --> V1[Dashboard Only]
```

### Permission Matrix

| Feature | Admin | Doctor | Nurse | Staff | Viewer |
|---|---:|---:|---:|---:|---:|
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register Patient | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Patient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assessment | ✅ | ✅ | ✅ | ❌ | ❌ |
| Care Plan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Home Visit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Data | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Core Database Architecture

```mermaid
erDiagram
    USERS ||--o{ AUDIT_LOGS : creates
    USERS ||--o{ VISITS : records
    USERS ||--o{ ASSESSMENTS : assesses

    PATIENTS ||--o{ VISITS : has
    PATIENTS ||--o{ ASSESSMENTS : has
    PATIENTS ||--o{ CARE_PLANS : has
    PATIENTS ||--o{ APPOINTMENTS : has
    PATIENTS ||--o{ DOCUMENTS : has
    PATIENTS ||--o{ REFERRALS : has
    PATIENTS ||--o{ FAMILY_CONTACTS : has

    CARE_PLANS ||--o{ CARE_PLAN_ITEMS : contains

    USERS {
        int id PK
        string username
        string password_hash
        string fullname
        string role
        string department
        boolean active
        datetime last_login_at
        datetime created_at
    }

    PATIENTS {
        int id PK
        string hn
        string cid
        string fullname
        date birthdate
        string sex
        string address
        string phone
        string diagnosis
        string palliative_status
        datetime registered_at
        datetime created_at
        datetime updated_at
    }

    FAMILY_CONTACTS {
        int id PK
        int patient_id FK
        string name
        string relationship
        string phone
        string address
    }

    VISITS {
        int id PK
        int patient_id FK
        int user_id FK
        date visit_date
        string visit_type
        string location
        text subjective
        text objective
        text note
        datetime created_at
    }

    ASSESSMENTS {
        int id PK
        int patient_id FK
        int user_id FK
        int pps_score
        int pain_score
        text esas_json
        text symptom_note
        datetime assessed_at
    }

    CARE_PLANS {
        int id PK
        int patient_id FK
        int created_by FK
        string status
        datetime start_date
        datetime end_date
        text summary
    }

    CARE_PLAN_ITEMS {
        int id PK
        int care_plan_id FK
        text problem
        text goal
        text intervention
        string responsible_team
        string status
    }

    APPOINTMENTS {
        int id PK
        int patient_id FK
        datetime appointment_date
        string appointment_type
        string location
        string status
        text note
    }

    DOCUMENTS {
        int id PK
        int patient_id FK
        int uploaded_by FK
        string file_name
        string file_path
        string mime_type
        int file_size
        datetime uploaded_at
    }

    REFERRALS {
        int id PK
        int patient_id FK
        string from_unit
        string to_unit
        string reason
        string status
        datetime referred_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string table_name
        int record_id
        string ip_address
        datetime created_at
    }
```

---

## 8. API Architecture

### API Grouping

```text
/api/auth
/api/users
/api/patients
/api/assessments
/api/care-plans
/api/visits
/api/appointments
/api/documents
/api/reports
/api/integrations
/api/settings
```

### Example REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/patients` | รายชื่อผู้ป่วย |
| POST | `/api/patients` | เพิ่มผู้ป่วย |
| GET | `/api/patients/{id}` | รายละเอียดผู้ป่วย |
| PUT | `/api/patients/{id}` | แก้ไขข้อมูลผู้ป่วย |
| POST | `/api/patients/{id}/assessments` | บันทึก PPS/ESAS/Pain Score |
| POST | `/api/patients/{id}/visits` | บันทึกการเยี่ยมบ้าน |
| POST | `/api/patients/{id}/care-plans` | สร้างแผนการดูแล |
| GET | `/api/reports/dashboard` | ข้อมูล Dashboard |
| GET | `/api/reports/export/excel` | Export Excel |
| GET | `/api/reports/export/pdf` | Export PDF |

### API Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Proxy as Nginx/Apache
    participant API
    participant Auth
    participant DB
    participant Audit

    Client->>Proxy: HTTPS Request
    Proxy->>API: Forward Request
    API->>Auth: Validate Session/JWT
    Auth-->>API: User + Role
    API->>DB: Query / Update
    DB-->>API: Result
    API->>Audit: Save Activity Log
    API-->>Client: JSON Response
```

---

## 9. Frontend Architecture

```mermaid
flowchart TD
    APP[App Root]
    ROUTER[Router]
    LAYOUT[Main Layout]
    AUTH[Auth Guard]
    API[API Client]

    APP --> ROUTER
    ROUTER --> AUTH
    AUTH --> LAYOUT

    LAYOUT --> DASH[Dashboard Page]
    LAYOUT --> PATIENT[Patient Module]
    LAYOUT --> VISIT[Visit Module]
    LAYOUT --> REPORT[Report Module]
    LAYOUT --> SETTING[Setting Module]

    PATIENT --> P1[Patient List]
    PATIENT --> P2[Patient Profile]
    PATIENT --> P3[Assessment Form]
    PATIENT --> P4[Care Plan Form]

    DASH --> API
    PATIENT --> API
    VISIT --> API
    REPORT --> API
    SETTING --> API
```

### Suggested Frontend Structure

```text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── visits/
│   │   ├── reports/
│   │   └── settings/
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── authService.ts
│   │   ├── patientService.ts
│   │   └── reportService.ts
│   ├── hooks/
│   ├── stores/
│   └── utils/
```

---

## 10. Backend Architecture

```mermaid
flowchart TD
    ROUTES[Routes]
    MIDDLEWARE[Middleware]
    CONTROLLERS[Controllers]
    SERVICES[Services]
    REPOSITORIES[Repositories]
    MODELS[Models]
    DB[(Database)]

    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> REPOSITORIES
    REPOSITORIES --> MODELS
    MODELS --> DB
```

### Suggested Backend Structure

```text
backend/
├── app/
│   ├── controllers/
│   │   ├── AuthController
│   │   ├── PatientController
│   │   ├── AssessmentController
│   │   ├── VisitController
│   │   └── ReportController
│   ├── services/
│   │   ├── AuthService
│   │   ├── PatientService
│   │   ├── AssessmentService
│   │   ├── VisitService
│   │   └── ReportService
│   ├── repositories/
│   ├── models/
│   ├── middleware/
│   └── jobs/
├── database/
├── routes/
└── tests/
```

---

## 11. Security Architecture

```mermaid
flowchart TB
    USER[User]
    HTTPS[HTTPS/TLS]
    WAF[Firewall / WAF]
    APP[Application]
    AUTH[Auth + RBAC]
    VALIDATE[Input Validation]
    DB[(Encrypted/Protected DB)]
    AUDIT[Audit Log]
    BACKUP[Encrypted Backup]

    USER --> HTTPS
    HTTPS --> WAF
    WAF --> APP
    APP --> AUTH
    APP --> VALIDATE
    AUTH --> DB
    VALIDATE --> DB
    APP --> AUDIT
    DB --> BACKUP
```

### Security Checklist

- ใช้ HTTPS ทุก request
- Hash password ด้วย bcrypt/argon2
- ใช้ Role-Based Access Control
- แยกสิทธิ์ Admin/Doctor/Nurse/Staff/Viewer
- Validate input ทุก endpoint
- ป้องกัน SQL Injection ด้วย ORM/Prepared Statement
- ป้องกัน XSS ด้วย output escaping
- จำกัดขนาดและชนิดไฟล์ upload
- บันทึก audit log ทุก action สำคัญ
- Backup database แบบเข้ารหัส
- ไม่เก็บ secret ใน source code
- ใช้ `.env` สำหรับ config
- เปิด log เฉพาะที่จำเป็น ไม่ log CID/password/token

---

## 12. Deployment Architecture

### Single Server Deployment

```mermaid
flowchart TB
    INTERNET[Internet / Hospital LAN]
    SERVER[Linux Server]
    PROXY[Nginx / Apache]
    APP[Application Container]
    DB[(MySQL / MariaDB)]
    STORAGE[(Uploads Storage)]
    BACKUP[(Backup Directory / NAS)]

    INTERNET --> SERVER
    SERVER --> PROXY
    PROXY --> APP
    APP --> DB
    APP --> STORAGE
    DB --> BACKUP
    STORAGE --> BACKUP
```

### Docker Compose Deployment

```text
docker-compose.yml
├── reverse-proxy
├── frontend
├── backend-api
├── database
├── redis
├── queue-worker
└── backup-service
```

### Recommended Server Spec

| Environment | CPU | RAM | Storage | Database |
|---|---:|---:|---:|---|
| Development | 2 Core | 4 GB | 50 GB | MySQL/MariaDB |
| Small Hospital | 4 Core | 8 GB | 200 GB SSD | MySQL/MariaDB |
| Province Level | 8 Core | 16 GB | 500 GB SSD + NAS | PostgreSQL/MySQL |

---

## 13. Backup and Restore Architecture

```mermaid
flowchart LR
    DB[(Database)] --> DUMP[Daily SQL Dump]
    FILES[(Uploaded Files)] --> ZIP[Daily File Archive]
    DUMP --> COMPRESS[Compress + Encrypt]
    ZIP --> COMPRESS
    COMPRESS --> LOCAL[Local Backup]
    COMPRESS --> NAS[NAS / Network Share]
    COMPRESS --> CLOUD[Optional Cloud Backup]

    LOCAL --> RETENTION[Retention 15-30 Days]
    NAS --> RETENTION
    CLOUD --> RETENTION
```

### Backup Policy

```text
Database Backup : ทุกวัน 02:00
File Backup     : ทุกวัน 02:30
Retention       : 15-30 วัน
Monthly Backup  : เก็บ 12 เดือน
Restore Test    : ทดสอบอย่างน้อยเดือนละ 1 ครั้ง
```

---

## 14. Integration Architecture

```mermaid
flowchart TB
    PALL[paliativeKSP API]
    HOSXP[HOSxP / HIS Database]
    FHIR[FHIR Server]
    LINE[LINE OA / Notify]
    SMTP[SMTP Email]
    EXPORT[Excel / PDF]

    HOSXP -->|Patient / Visit / Diagnosis Sync| PALL
    PALL -->|FHIR Patient / Observation| FHIR
    PALL -->|Appointment Reminder| LINE
    PALL -->|Report / Notification| SMTP
    PALL --> EXPORT
```

### HOSxP Integration Concept

```text
Sync Data From HOSxP:
- patient.hn
- patient.cid
- patient.fullname
- patient.birthdate
- patient.address
- ovst.vn
- ovst.vstdate
- ipt.an
- icd10 diagnosis
- doctor/nurse note if permitted
```

### Integration Strategy

1. Phase 1: Manual import via Excel/CSV
2. Phase 2: Read-only DB view from HOSxP
3. Phase 3: Scheduled sync job
4. Phase 4: API/FHIR-based integration

---

## 15. Reporting Architecture

```mermaid
flowchart TD
    DB[(Database)] --> QUERY[Report Query Layer]
    QUERY --> AGG[Aggregate / Summary]
    AGG --> DASH[Dashboard]
    AGG --> PDF[PDF Generator]
    AGG --> EXCEL[Excel Generator]

    DASH --> USER[User]
    PDF --> USER
    EXCEL --> USER
```

### Recommended Reports

- จำนวนผู้ป่วย Palliative ทั้งหมด
- ผู้ป่วย active / discharge / deceased
- ผู้ป่วยแยกตามตำบล/หมู่บ้าน
- คะแนน PPS ล่าสุด
- Pain Score ล่าสุด
- ผู้ป่วยที่ต้องเยี่ยมบ้านในเดือนนี้
- รายงานการเยี่ยมบ้าน
- รายงานผู้ป่วยอาการแย่ลง
- รายงานส่งต่อ
- รายงานสำหรับผู้บริหาร

---

## 16. CI/CD Architecture

```mermaid
flowchart LR
    DEV[Developer Push Code]
    GITHUB[GitHub Repository]
    ACTIONS[GitHub Actions]
    TEST[Test / Lint]
    BUILD[Build Docker Image]
    DEPLOY[Deploy to Server]
    HEALTH[Health Check]

    DEV --> GITHUB
    GITHUB --> ACTIONS
    ACTIONS --> TEST
    TEST --> BUILD
    BUILD --> DEPLOY
    DEPLOY --> HEALTH
```

### Suggested GitHub Actions Pipeline

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]

jobs:
  test-build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Run backend/frontend tests"
      - name: Build
        run: echo "Build application"
      - name: Deploy
        run: echo "Deploy to production server"
```

---

## 17. Observability and Audit

```mermaid
flowchart TB
    APP[Application]
    ACCESS[Access Log]
    ERROR[Error Log]
    AUDIT[Audit Log]
    METRIC[Metrics]
    ALERT[Alert]

    APP --> ACCESS
    APP --> ERROR
    APP --> AUDIT
    APP --> METRIC
    ERROR --> ALERT
    METRIC --> ALERT
```

### Logs ที่ควรมี

| Log | Purpose |
|---|---|
| Access Log | ใครเข้าใช้งานเมื่อไหร่ |
| Audit Log | ใครแก้ไขข้อมูลอะไร |
| Error Log | ตรวจสอบ bug/runtime error |
| Integration Log | ตรวจสอบ sync HOSxP/API |
| Backup Log | ตรวจสอบ backup สำเร็จหรือไม่ |

---

## 18. Mobile / PWA Architecture

```mermaid
flowchart TB
    MOBILE[Mobile / Tablet]
    PWA[PWA App]
    CACHE[Offline Cache]
    API[Backend API]
    DB[(Database)]

    MOBILE --> PWA
    PWA --> CACHE
    PWA --> API
    API --> DB
    CACHE -->|Sync when online| API
```

### Mobile Features

- Login
- รายชื่อผู้ป่วยที่ต้องเยี่ยม
- บันทึกเยี่ยมบ้าน
- บันทึก Pain Score / PPS / ESAS
- แนบรูปภาพ/เอกสาร
- Offline draft และ sync ภายหลัง
- แผนที่บ้านผู้ป่วย

---

## 19. Development Roadmap

```mermaid
gantt
    title paliativeKSP Development Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1 Core
    Auth + User Role           :a1, 2026-05-01, 7d
    Patient Registry           :a2, after a1, 10d
    Assessment Forms           :a3, after a2, 10d
    section Phase 2 Care Workflow
    Care Plan                  :b1, after a3, 10d
    Home Visit                 :b2, after b1, 10d
    Appointment                :b3, after b2, 7d
    section Phase 3 Reports
    Dashboard                  :c1, after b3, 7d
    PDF / Excel Export         :c2, after c1, 7d
    section Phase 4 Integration
    HOSxP Import               :d1, after c2, 14d
    LINE Notification          :d2, after d1, 7d
```

---

## 20. Recommended Repository Structure

```text
paliativeKSP/
├── docs/
│   ├── flowchart.md
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── deployment.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── app/
│   ├── routes/
│   ├── database/
│   ├── tests/
│   ├── .env.example
│   └── Dockerfile
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── schema.sql
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   └── deploy.sh
├── docker-compose.yml
├── README.md
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 21. Production Checklist

### Application

- [ ] Login / Logout
- [ ] Role Permission
- [ ] Patient Registry
- [ ] Assessment Form
- [ ] Care Plan
- [ ] Home Visit
- [ ] Appointment
- [ ] Report Dashboard
- [ ] PDF / Excel Export

### Security

- [ ] HTTPS
- [ ] Password Hashing
- [ ] RBAC
- [ ] Audit Log
- [ ] Input Validation
- [ ] File Upload Validation
- [ ] Backup Encryption

### Infrastructure

- [ ] Docker Compose
- [ ] Nginx/Apache Reverse Proxy
- [ ] Database Backup
- [ ] Log Rotation
- [ ] Monitoring
- [ ] Restore Test

### Integration

- [ ] HOSxP Import
- [ ] LINE Notification
- [ ] FHIR Mapping
- [ ] Export Format

---

## 22. Architecture Decision Records

### ADR-001: API-first Architecture

ใช้ Backend API แยกจาก Frontend เพื่อให้รองรับ Web, Mobile และ Integration ได้ในอนาคต

### ADR-002: Role-Based Access Control

ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว จึงต้องควบคุมการเข้าถึงตามบทบาทของผู้ใช้

### ADR-003: Audit Log Required

ทุกการดู/เพิ่ม/แก้ไข/ลบข้อมูลสำคัญควรมี audit log เพื่อรองรับการตรวจสอบย้อนหลัง

### ADR-004: Modular Domain Design

แยก module ตาม business domain ได้แก่ Patient, Assessment, Care Plan, Home Visit, Report และ Integration เพื่อให้พัฒนาต่อได้ง่าย

---

## 23. Summary

สถาปัตยกรรมที่แนะนำสำหรับ `paliativeKSP` คือระบบแบบ modular API-first ที่มี Web UI, Backend API, Database, Report Service, File Storage, Audit Log, Backup และ Integration Layer โดยสามารถเริ่มจาก single-server deployment ก่อน แล้วค่อยขยายเป็น Docker/Kubernetes หรือเชื่อมต่อ HOSxP/FHIR ในอนาคต

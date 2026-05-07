# paliativeKSP

ระบบต้นแบบสำหรับบริหารจัดการผู้ป่วย Palliative Care รองรับงานทะเบียนผู้ป่วย การประเมิน PPS/ESAS/Pain Score การเยี่ยมบ้าน แผนการดูแล รายงาน และการเชื่อมต่อระบบโรงพยาบาลในอนาคต

## Documents

- [Flow Chart](docs/flowchart.md)
- [System Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)

## Features

- Authentication / Role-Based Access Control
- Patient Registry
- Palliative Assessment
- Care Plan
- Home Visit
- Appointment
- Document Upload
- Dashboard & Reports
- PDF / Excel Export concept
- HOSxP / FHIR integration concept

## Recommended Stack

This starter uses a lightweight API-first Node.js structure.

```text
Backend      : Node.js + Express
Database     : MySQL/MariaDB
Deployment   : Docker Compose
Reverse Proxy: Nginx or Apache in production
```

## Quick Start

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
```

API health check:

```bash
curl http://localhost:3000/health
```

## Default Services

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| MySQL | localhost:3306 |

## Folder Structure

```text
paliativeKSP/
├── backend/
├── database/
├── docs/
├── scripts/
├── docker-compose.yml
└── README.md
```

## Development Roadmap

1. Build authentication and user role
2. Build patient registry
3. Build assessment forms
4. Build care plan and visit workflow
5. Build reports and export
6. Add HOSxP sync
7. Add mobile/PWA support

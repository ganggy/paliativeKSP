# Flow Chart: paliativeKSP

> เอกสารนี้เป็น flow chart ภาพรวมสำหรับระบบ `paliativeKSP` เพื่อใช้เป็นเอกสารประกอบการพัฒนา/ส่งต่องาน
>
> หมายเหตุ: สร้างจากการออกแบบระบบ Palliative Care Web Application ตามชื่อโปรเจกต์และบริบทการใช้งาน เนื่องจากไม่พบไฟล์โครงสร้างหลักใน root เช่น `README.md`, `package.json`, `composer.json`, `index.php` ผ่านเครื่องมือที่อ่านได้ในขณะสร้างเอกสารนี้

---

## 1. System Overview Flow

```mermaid
flowchart TD
    A([เริ่มต้น]) --> B[เข้าสู่ระบบ]
    B --> C{ตรวจสอบสิทธิ์ผู้ใช้งาน}

    C -->|Admin| D[Admin Dashboard]
    C -->|แพทย์| E[Doctor Dashboard]
    C -->|พยาบาล/ทีมเยี่ยมบ้าน| F[Nurse / Home Visit Dashboard]
    C -->|เจ้าหน้าที่| G[Staff Dashboard]
    C -->|ไม่ผ่าน| X[แจ้งเตือน Login ไม่สำเร็จ]

    D --> D1[จัดการผู้ใช้งาน]
    D --> D2[กำหนดสิทธิ์]
    D --> D3[ดูรายงานภาพรวม]

    E --> E1[ดูรายชื่อผู้ป่วย]
    E --> E2[ประเมินอาการ]
    E --> E3[วางแผนการรักษา]
    E --> E4[จัดการยา/คำสั่งรักษา]

    F --> F1[บันทึกเยี่ยมบ้าน]
    F --> F2[ติดตามอาการ]
    F --> F3[บันทึก Pain Score / PPS / ESAS]

    G --> G1[ลงทะเบียนผู้ป่วย]
    G --> G2[จัดการนัดหมาย]
    G --> G3[แนบเอกสาร]

    E1 --> H[แฟ้มผู้ป่วย Palliative]
    E2 --> H
    E3 --> H
    E4 --> H
    F1 --> H
    F2 --> H
    F3 --> H
    G1 --> H
    G2 --> H
    G3 --> H

    H --> I[(Database)]
    I --> J[Dashboard / รายงาน]
    J --> K[Export PDF / Excel]
    K --> L([สิ้นสุด])
```

---

## 2. Patient Care Workflow

```mermaid
flowchart TD
    A[รับผู้ป่วยเข้าสู่ระบบ] --> B[บันทึกข้อมูลทั่วไป]
    B --> C[คัดกรอง Palliative Care]
    C --> D{เข้าเกณฑ์ Palliative หรือไม่}

    D -->|ใช่| E[สร้างทะเบียนผู้ป่วย Palliative]
    D -->|ไม่ใช่| F[บันทึกผลและติดตามตามระบบปกติ]

    E --> G[ประเมิน PPS / ESAS / Pain Score]
    G --> H[กำหนด Care Plan]
    H --> I[นัดหมาย / วางแผนเยี่ยมบ้าน]
    I --> J[ทีมสหวิชาชีพติดตาม]
    J --> K[บันทึกผลการเยี่ยม/อาการล่าสุด]
    K --> L{อาการเปลี่ยนแปลงหรือไม่}

    L -->|ดีขึ้น/คงที่| M[ติดตามต่อเนื่อง]
    L -->|แย่ลง| N[ปรับ Care Plan / ส่งต่อแพทย์]
    L -->|เสียชีวิต| O[บันทึกจำหน่าย / ปิดเคส]

    M --> I
    N --> H
    O --> P[สรุปรายงาน]
```

---

## 3. Data Flow Diagram Level 0

```mermaid
flowchart LR
    U[ผู้ใช้งานระบบ] -->|กรอก/แก้ไขข้อมูล| S[Palliative KSP System]
    S -->|อ่าน/เขียนข้อมูล| DB[(Database)]
    S -->|แสดงผล| U
    S -->|สร้างรายงาน| R[Reports]
    R -->|PDF / Excel| U
```

---

## 4. Database Relationship Concept

```mermaid
erDiagram
    USERS ||--o{ VISITS : records
    PATIENTS ||--o{ VISITS : has
    PATIENTS ||--o{ ASSESSMENTS : has
    PATIENTS ||--o{ CARE_PLANS : has
    PATIENTS ||--o{ APPOINTMENTS : has
    PATIENTS ||--o{ DOCUMENTS : has

    USERS {
        int id PK
        string username
        string password_hash
        string fullname
        string role
        datetime created_at
    }

    PATIENTS {
        int id PK
        string hn
        string cid
        string fullname
        date birthdate
        string address
        string phone
        string status
        datetime created_at
    }

    VISITS {
        int id PK
        int patient_id FK
        int user_id FK
        date visit_date
        string visit_type
        text note
    }

    ASSESSMENTS {
        int id PK
        int patient_id FK
        int pps_score
        int pain_score
        text esas_detail
        datetime assessed_at
    }

    CARE_PLANS {
        int id PK
        int patient_id FK
        text problem
        text goal
        text plan
        string status
    }

    APPOINTMENTS {
        int id PK
        int patient_id FK
        datetime appointment_date
        string location
        string status
    }

    DOCUMENTS {
        int id PK
        int patient_id FK
        string file_name
        string file_path
        datetime uploaded_at
    }
```

---

## 5. API / Web Request Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Web as Web Frontend
    participant API as Backend/API
    participant DB as Database

    User->>Web: Login
    Web->>API: POST /login
    API->>DB: ตรวจสอบ username/password
    DB-->>API: user + role
    API-->>Web: session/token

    User->>Web: เปิดแฟ้มผู้ป่วย
    Web->>API: GET /patients/{id}
    API->>DB: Query patient profile
    DB-->>API: patient data
    API-->>Web: JSON response

    User->>Web: บันทึกการประเมิน
    Web->>API: POST /assessments
    API->>DB: Insert assessment
    DB-->>API: success
    API-->>Web: บันทึกสำเร็จ
```

---

## 6. Recommended Folder Structure

```text
paliativeKSP/
├── docs/
│   └── flowchart.md
├── frontend/
│   ├── pages/
│   ├── components/
│   └── services/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── services/
├── database/
│   ├── migrations/
│   └── seeders/
└── README.md
```

---

## 7. Suggested Next Diagrams

- Use Case Diagram
- DFD Level 1 / Level 2
- Deployment Diagram
- CI/CD Flow
- Backup & Restore Flow
- HOSxP Integration Flow
- ThaiCareCloud / FHIR Integration Flow

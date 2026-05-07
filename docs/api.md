# API Documentation

Base URL

```text
http://localhost:3000/api
```

## Authentication

### Login

```http
POST /auth/login
```

Request

```json
{
  "username": "admin"
}
```

Response

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Patients

### Get all patients

```http
GET /patients
Authorization: Bearer <token>
```

### Get patient by ID

```http
GET /patients/:id
Authorization: Bearer <token>
```

### Create patient

```http
POST /patients
Authorization: Bearer <token>
```

Body

```json
{
  "hn": "6500001",
  "cid": "1234567890123",
  "fullname": "Demo Patient",
  "birthdate": "1980-01-01",
  "phone": "0800000000",
  "address": "Thailand",
  "diagnosis": "Cancer",
  "palliative_status": "active"
}
```

### Update patient

```http
PUT /patients/:id
Authorization: Bearer <token>
```

### Delete patient

```http
DELETE /patients/:id
Authorization: Bearer <token>
```

---

## Assessments

### Get patient assessments

```http
GET /assessments/:patientId
Authorization: Bearer <token>
```

### Create assessment

```http
POST /assessments/:patientId
Authorization: Bearer <token>
```

Body

```json
{
  "pps_score": 70,
  "pain_score": 3,
  "esas_detail": "Mild fatigue"
}
```

---

## Visits

### Get patient visits

```http
GET /visits/:patientId
Authorization: Bearer <token>
```

### Create visit

```http
POST /visits/:patientId
Authorization: Bearer <token>
```

Body

```json
{
  "visit_date": "2026-05-07",
  "visit_type": "home",
  "note": "Patient stable"
}
```

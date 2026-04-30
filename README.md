# Perizinan Siswa API

Backend Express.js (ESM) untuk sistem perizinan siswa berbasis role.

## Stack
- Express.js + PostgreSQL
- Knex migration + seed
- JWT access/refresh
- Upload dokumen local disk
- Signed QR URL (expirable)

## Setup
1. Copy env:
   - `cp .env.example .env`
2. Install:
   - `pnpm install`
3. Jalankan migration + seed:
   - `pnpm migrate`
   - `pnpm seed`
4. Start dev server:
   - `pnpm dev`

## Swagger Docs
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/docs.json`

## Endpoint utama
- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/change-password`, `GET /api/v1/auth/me`
- Profile: `GET /api/v1/profile`, `PATCH /api/v1/profile`
- Permissions:
  - `POST /api/v1/permissions`
  - `GET /api/v1/permissions`
  - `GET /api/v1/permissions/:id`
  - `PATCH /api/v1/permissions/:id/wali-approve`
  - `PATCH /api/v1/permissions/:id/piket-approve`
  - `PATCH /api/v1/permissions/:id/reject`
  - `POST /api/v1/permissions/:id/document`
  - `POST /api/v1/permissions/:id/qr`
  - `GET /api/v1/permissions/history/grouped-by-class`
- Security:
  - `GET /api/v1/security/scan/:token`
  - `PATCH /api/v1/security/permissions/:id/return`
  - `PATCH /api/v1/security/permissions/:id/no-return`
- Kelas:
  - `GET /api/v1/classes/students`
- Laporan:
  - `GET /api/v1/reports/entry-exit`
  - `GET /api/v1/reports/entry-exit/export.xlsx`
- Admin:
  - `POST /api/v1/admin/students/import.xlsx`

## Kredensial seed
- Siswa: username `2024001`, password `2024001`
- Wali Kelas: username `NIP001`, password `password`
- Guru Piket: username `NIP002`, password `password`
- Security: username `SEC001`, password `password`
- Admin: username `ADM001`, password `password`

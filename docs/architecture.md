# ระบบจัดการ Log – สถาปัตยกรรมและ Stack

## 1. ภาพรวมสถาปัตยกรรม
![architecture diagram](https://i.ibb.co/DDv1fSZb/2568-09-09-22-10-16.png)

### Data Flow
1. **Syslog Flow (Network/Firewall)**  
   - Network/Firewall → Fluent Bit → Ingest Service → Database  
   - Logs ถูก parse และ tag → JSON format (log_type: network/firewall)

2. **Direct API Flow (Tenant Logs)**  
   - ระบบภายนอก (AWS/CrowdStrike) → Ingest Service → Database  
   - JSON validation & classification (log_type: tenant)

3. **การเข้าถึงของผู้ใช้**  
   - ผู้ใช้ → Frontend (Next.js) → Backend API → Database  
   - JWT auth และ role-based access → filter logs ตาม tenant

## 2. Tech Stack

| Component        | Technology / Tools             |
|-----------------|-------------------------------|
| Frontend UI      | Next.js           |
| Backend API      | Node.js + Express             |
| Ingest Service   | Node.js + Express             |
| Syslog Collector | Fluent Bit                    |
| Database         | MySQL 8.0                     |
| Containerization | Docker + Docker Compose       |

## 3. Database และ Multi-Tenant
- **ตารางหลัก**: users, tenants, sources, logs, alerts  
- **ประเภท Log**: network, firewall, tenant  
- **การเข้าถึง tenant**:
  - admin → ทุก tenant และทุก log  
  - tenant → เฉพาะ log ของตัวเอง  
- Foreign keys: `logs.tenant_id → tenants.id`, `logs.source_id → sources.id`

## 4. Ports ของระบบ
| Port / Protocol | การใช้งาน                         |
|----------------|----------------------------------|
| 514/UDP         | Firewall syslog → Fluent Bit     |
| 515/UDP         | Network syslog → Fluent Bit      |
| 3000/TCP        | Ingest API (HTTP)                |
| 3001/TCP        | Frontend UI (HTTP)               |
| 3002/TCP        | Backend API (HTTP)               |
| 3306/TCP        | MySQL Database (internal)        |


## 5. Tenant Model และ Multi-Tenancy

### 5.1 Access Control Matrix
```
Role     | Access Level              |
---------|---------------------------|
admin    | เข้าถึงได้ทุกอย่าง             |
tenant   | เข้าถึงได้แค่ข้อมูลตัวเอง        |
```

### 5.2 Tenant Data Isolation
- แต่ละ tenant มี unique `tenant_id`
- Log queries ถูก filter ตาม `tenant_id` อัตโนมัติ
- Admin เห็นข้อมูลทั้งหมด (multi-tenant view)
- Tenant เห็นเฉพาะข้อมูลของตนเอง


## 6. Indexes ที่มีใน Database

### ตาราง `logs`
- `idx_timestamp (timestamp)`  
- `idx_tenant_id (tenant_id)`  
- `idx_source_id (source_id)`  
- `idx_log_type (log_type)`  
- `idx_event_type (event_type)`  
- `idx_src_ip (src_ip)`  

### ตาราง `alerts`
- `idx_alert_type (alert_type)`  
- `idx_created_at (created_at)`

## 7. Security และ Data Retention

### 7.1 Security Features
- JWT token-based authentication
- Role-based access control (RBAC)
- Query-level tenant filtering

### 7.2 Data Retention Policy
- **Logs**: เก็บ 7 วัน (automatic cleanup)
- **Alerts**: เก็บ 30 วัน (automatic cleanup)
- **Manual cleanup**: Admin สามารถรัน manual cleanup ได้
- **Cleanup schedule**: รันทุก 24 ชั่วโมง  

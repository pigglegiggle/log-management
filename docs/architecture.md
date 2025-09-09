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

| Component        | Technology / Tools             | Port                        |
|-----------------|-------------------------------|--------------------------------|
| Frontend UI      | Next.js + Next.js             | 3001 (HTTP)                    |
| Backend API      | Node.js + Express             | 3002 (HTTP, REST API)          |
| Ingest Service   | Node.js + Express             | 3000 (HTTP, REST API)          |
| Syslog Collector | Fluent Bit                    | UDP 514/515                     |
| Database         | MySQL 8.0                     | 3306                           |
| Containerization | Docker + Docker Compose       |                           |

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
Role     | Access Level              | Data Scope
---------|---------------------------|---------------------------
admin    | Full system access        | All tenants, all logs
tenant   | Limited to own data       | Own tenant logs only
```

### 5.2 Tenant Data Isolation
- แต่ละ tenant มี unique `tenant_id`
- Log queries ถูก filter ตาม `tenant_id` อัตโนมัติ
- Admin เห็นข้อมูลทั้งหมด (multi-tenant view)
- Tenant เห็นเฉพาะข้อมูลของตนเอง

### 5.3 Data Storage Pattern
```sql
logs table structure:
- tenant_id (FK) → tenants.id (สำหรับ tenant logs)
- source_id (FK) → sources.id (แหล่งที่มา)
- log_type → classification (network/firewall/tenant)
```

### 5.4 Tenant Authentication Flow
```
1. User Login → JWT Token (contains tenant info)
2. API Request → JWT Validation → Extract tenant_id
3. Database Query → Auto-filter by tenant_id (if not admin)
4. Return filtered results
```

### 5.5 Tenant Registration Process
```
1. Admin creates tenant record in database
2. Tenant user created with tenant role
3. Username = tenant name (for mapping)
4. Logs automatically assigned to tenant via source mapping
```

### 5.6 Log-to-Tenant Mapping
- **Network/Firewall logs**: ไม่มี tenant_id (shared infrastructure)
- **Tenant logs**: มี tenant_id จาก API payload
- **Source mapping**: ใช้ source_id เพื่อระบุประเภท log

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
- Input validation และ sanitization

### 7.2 Data Retention Policy
- **Logs**: เก็บ 7 วัน (automatic cleanup)
- **Alerts**: เก็บ 30 วัน (automatic cleanup)
- **Manual cleanup**: Admin สามารถรัน manual cleanup ได้
- **Cleanup schedule**: รันทุก 24 ชั่วโมง  
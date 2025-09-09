# Log Management System Architecture

## ภาพรวมระบบ

```
[Log Sources] → [Ingest Service] → [Database] → [Backend API] → [Frontend UI]
     ↓               ↓                ↓             ↓              ↓
  Network         Port 3000      MySQL 8.0    Port 3002     Next.js
  Firewall       REST API        (logdb)       REST API      React UI
  Tenant Logs
```

## Data Flow Architecture

### 1. Log Ingestion Flow
```
External Systems → Ingest Service (Port 3000) → Database
                      ↓
                 Log Classification
                 (network/firewall/tenant)
                      ↓
                 Data Parsing & Validation
                      ↓
                 Database Storage
```

### 2. User Access Flow
```
User → Frontend (Next.js) → Backend API (Port 3002) → Database
  ↓         ↓                    ↓                      ↓
Auth     JWT Token         Role-based Access      Filtered Data
```

## Database Schema

### Core Tables
- **users**: ระบบ authentication (admin/tenant roles)
- **tenants**: จัดการ tenant organizations
- **sources**: แหล่งที่มาของ logs (network, firewall, aws, crowdstrike)
- **logs**: ตารางหลักเก็บ log ทั้งหมด
- **alerts**: การแจ้งเตือนความปลอดภัย

### Log Types Classification
1. **Network Logs**: log_type = 'network'
2. **Firewall Logs**: log_type = 'firewall'  
3. **Tenant Logs**: log_type = 'tenant' (AWS, CrowdStrike, etc.)

## Tenant Model

### Access Control Matrix
```
Role     | Access Level              | Data Scope
---------|---------------------------|---------------------------
admin    | Full system access        | All tenants, all logs
tenant   | Limited to own data       | Own tenant logs only
```

### Tenant Data Isolation
- แต่ละ tenant มี unique tenant_id
- Log queries ถูก filter ตาม tenant_id อัตโนมัติ
- Admin เห็นข้อมูลทั้งหมด (multi-tenant view)
- Tenant เห็นเฉพาะข้อมูลของตนเอง

### Data Storage Pattern
```sql
logs table structure:
- tenant_id (FK) → tenants.id (สำหรับ tenant logs)
- source_id (FK) → sources.id (แหล่งที่มา)
- log_type → classification (network/firewall/tenant)
```

## Service Components

### 1. Ingest Service (Port 3000)
- รับ log data จาก external sources
- Parse และ classify logs
- Store ลง database
- Support multiple log formats

### 2. Backend API (Port 3002)
- Authentication & Authorization
- Role-based data filtering
- Log retrieval APIs
- Retention management

### 3. Frontend UI (Next.js)
- Dashboard สำหรับแต่ละ role
- Log viewing และ filtering
- Real-time search
- Admin management tools

### 4. Database (MySQL 8.0)
- Central data storage
- Foreign key relationships
- Performance indexes
- Data retention policies

## Data Retention Policy

### Automatic Cleanup
- Logs: เก็บ 7 วัน
- Alerts: เก็บ 30 วัน
- รัน cleanup ทุก 24 ชั่วโมง

### Manual Controls
- Admin สามารถรัน manual cleanup
- View database size statistics
- Monitor retention effectiveness


# Log Management System Architecture

## ภาพรวมระบบ

```
[Syslog Sources] → [Fluent Bit] → [Ingest Service] → [Database] → [Backend API] → [Frontend UI]
      ↓              ↓ (UDP)           ↓                ↓             ↓              ↓
   Network         514/515        Port 3000       MySQL 8.0    Port 3002     Next.js
   Firewall        Syslog         REST API        (logdb)       REST API      React UI
   Systems         Listener       Parser
      
[Tenant Systems] → [Direct HTTP] → [Ingest Service] ↗
      ↓                 ↓
  AWS/CrowdStrike  JSON Payload
```

## Data Flow Architecture

### 1. Syslog Flow (Network/Firewall)
```
Network/Firewall Systems → Fluent Bit (UDP 514/515) → HTTP POST → Ingest Service → Database
                              ↓                          ↓
                         Syslog Parsing              JSON Format
                         Tag Classification         (log_type: network/firewall)
```

### 2. Direct API Flow (Tenant Logs)
```
External Systems (AWS/CrowdStrike) → Ingest Service (Port 3000) → Database
                                         ↓
                                   JSON Validation & Classification
                                   (log_type: tenant)
```

### 3. User Access Flow
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
1. **Network Logs**: 
   - Source: Syslog UDP port 515
   - Flow: Network devices → Fluent Bit → Ingest Service
   - log_type = 'network'

2. **Firewall Logs**: 
   - Source: Syslog UDP port 514
   - Flow: Firewall systems → Fluent Bit → Ingest Service
   - log_type = 'firewall'

3. **Tenant Logs**: 
   - Source: Direct HTTP API calls
   - Flow: AWS/CrowdStrike → Ingest Service
   - log_type = 'tenant'

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

### 1. Fluent Bit (Syslog Collector)
- Listen UDP ports 514 (firewall) และ 515 (network)
- รับ syslog messages จาก network/firewall systems
- Parse และ tag logs ตาม source port
- Forward เป็น JSON ไปยัง Ingest Service
- Configuration: `/fluent-bit/fluent-bit.conf`

### 2. Ingest Service (Port 3000)
- รับ log data จาก Fluent Bit (HTTP) และ external sources (direct API)
- Parse และ classify logs ตาม log_type
- Store ลง database พร้อม tenant/source mapping
- Support multiple log formats (syslog, JSON)

### 3. Backend API (Port 3002)
- Authentication & Authorization
- Role-based data filtering
- Log retrieval APIs
- Retention management

### 4. Frontend UI (Next.js)
- Dashboard สำหรับแต่ละ role
- Log viewing และ filtering
- Real-time search
- Admin management tools

### 5. Database (MySQL 8.0)
- Central data storage
- Foreign key relationships
- Performance indexes
- Data retention policies

## Network Ports & Protocols

### Inbound Ports
- **514/UDP**: Firewall syslog → Fluent Bit
- **515/UDP**: Network syslog → Fluent Bit
- **3000/TCP**: Ingest Service API (HTTP)
- **3002/TCP**: Backend API (HTTP)
- **3306/TCP**: MySQL Database

### Internal Communication
- Fluent Bit → Ingest Service: HTTP POST (JSON)
- Frontend → Backend: HTTP REST API (JWT Auth)
- Backend → Database: MySQL Protocol
- Ingest → Database: MySQL Protocol

## Docker Services Configuration

### fluent-bit
- Image: `cr.fluentbit.io/fluent/fluent-bit:latest`
- Ports: 514/UDP, 515/UDP
- Config: `/fluent-bit/config/fluent-bit.conf`
- Volume mounts: config และ logs directory

### ingest
- Build: `./ingest/Dockerfile`
- Port: 3000/TCP
- Dependencies: database health check

### backend
- Build: `./backend/Dockerfile`
- Port: 3002/TCP
- Dependencies: database health check

### frontend
- Build: `./frontend/Dockerfile`
- Port: 3001/TCP (dev mode)
- Dependencies: backend service

## Data Retention Policy

### Automatic Cleanup
- Logs: เก็บ 7 วัน
- Alerts: เก็บ 30 วัน
- รัน cleanup ทุก 24 ชั่วโมง

### Manual Controls
- Admin สามารถรัน manual cleanup
- View database size statistics
- Monitor retention effectiveness

## Security Features

### Authentication
- JWT token-based auth
- Role-based access control
- Session management

### Data Isolation
- Tenant-level data separation
- Query-level filtering
- No cross-tenant data leakage

### API Security
- Authorization middleware
- Input validation
- Error handling

## Performance Considerations

### Database Optimization
- Indexes บน timestamp, tenant_id, source_id
- Connection pooling
- Query limitations (LIMIT 1000)

### Frontend Optimization
- Client-side pagination
- Search filtering
- Real-time updates

### Scalability Design
- Microservice architecture
- Docker containerization
- Database connection pooling
- Fluent Bit buffering และ retry mechanisms


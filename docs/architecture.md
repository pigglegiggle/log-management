# ระบบจัดการ Log – สถาปัตยกรรมและ Stack

## 1. ภาพรวมสถาปัตยกรรม


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

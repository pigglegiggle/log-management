# การ Setup Log Management System บน Cloud

## Requirements เบื้องต้น (ขั้นต่ำ)

### Hardware Requirements 
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Storage**: 40 GB Disk

## การติดตั้งบน AWS EC2

### 1. สร้าง EC2 Instance

```bash
# Instance Type: t3.xlarge (4 vCPU, 16 GB RAM) หรือ t3.large (2 vCPU, 8 GB RAM)
# OS: Ubuntu 22.04 LTS
# Storage: 40GB gp3
# Security Group: เปิด ports 22, 80, 443, 3000-3002, 514-515
```

### 2. ติดตั้ง Docker และ Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# เพิ่ม user เข้า docker group
sudo usermod -aG docker $USER

# ติดตั้ง Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# ติดตั้ง Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ติดตั้ง npm dependencies ที่จำเป็น
sudo npm install -g pm2

# ตรวจสอบ versions
node --version
npm --version
docker --version
docker-compose --version

# รีสตาร์ท session
exit
# เข้า SSH ใหม่
```

### 3. Clone และ Setup Project

```bash
# Clone repository
git clone https://github.com/pigglegiggle/log-management.git
cd log-management

# รัน production deployment script
chmod +x Makefile/run_prod.sh
./Makefile/run_prod.sh
```

### 4. ตรวจสอบ Services

```bash
# ตรวจสอบว่า containers รันอยู่
docker ps

# ตรวจสอบ logs
docker logs backend
docker logs frontend
docker logs mysql_db

# ทดสอบ endpoints
curl http://localhost:3001  # Frontend
curl http://localhost:3002  # Backend API
curl -X POST http://localhost:3000/ingest -H "Content-Type: application/json" -d '{}' # Ingest Service
```

### 5. ทดสอบการส่ง Log

```bash
# ติดตั้ง dependencies สำหรับ samples
cd samples
npm install

# ทดสอบส่ง log ตัวอย่าง
node post_log.js

# ทดสอบส่ง syslog
node send_syslog.js

# ทดสอบ login failure logs
node login_fail.js

# ทดสอบผ่าน json batch
chmod +x samples/send_tenant.sh
./samples/send_tenant.sh

# กลับไปยัง root directory
cd ..
```

## การเข้าถึงจากภายนอก

### URLs สำหรับเข้าถึง
- **Frontend**: `http://your-ec2-ip:3001`
- **Backend API**: `http://your-ec2-ip:3002`
- **Ingest Service**: `http://your-ec2-ip:3000`

### Security Group Configuration
```
Port 22   (SSH)      - เฉพาะ IP ของคุณ
Port 80   (HTTP)     - 0.0.0.0/0
Port 443  (HTTPS)    - 0.0.0.0/0
Port 3000 (Ingest)   - 0.0.0.0/0
Port 3001 (Frontend) - 0.0.0.0/0
Port 3002 (Backend)  - 0.0.0.0/0
Port 514  (Syslog)   - 0.0.0.0/0
Port 515  (Syslog)   - 0.0.0.0/0
```

## การตั้งค่าต่างๆ

### Environment Modes
```bash
# Production mode (สำหรับ EC2/Cloud)
./Makefile/run_prod.sh
```

### Environment Variables
Production script จะสร้าง secure passwords อัตโนมัติ หากต้องการกำหนดเอง:
```bash
# แก้ไขใน Makefile/run_prod.sh
MYSQL_ROOT_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
```

### SSL/TLS Configuration (Caddy)
```bash
# สร้างไฟล์ Caddyfile
cat <<EOL > Caddyfile
your-domain.com {
    reverse_proxy frontend:3001
}
EOL
```

### การ Update System
```bash
# Pull latest code
git pull origin main

# Rebuild และ restart (Production)
./Makefile/run_prod.sh
```



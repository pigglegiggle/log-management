# การ Setup Log Management System บน Cloud

## Requirements เบื้องต้น (ขั้นต่ำ)

### Hardware Requirements 
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Storage**: 40 GB Disk

## การติดตั้งบน VM Ubuntu

### 1. ติดตั้ง Docker และ Node.js

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

### 2. Clone และ Setup Project

```bash
# Clone repository
git clone https://github.com/pigglegiggle/log-management.git
cd log-management

# รัน production deployment script
./Makefile/run_prod.sh
```

### 3. ทดสอบการส่ง Log

```bash
cd samples

# ทดสอบส่ง log ผ่าน HTTP
node post_log.js

# ทดสอบส่ง syslog ผ่าน UDP
node send_syslog.js

# ทดสอบ login failure logs (ระบบ alert)
node login_fail.js

# ทดสอบผ่าน json batch
./samples/send_tenant.sh
```

## การเข้าถึงจากภายนอก

### URLs สำหรับเข้าถึง
- **Frontend**: `http://your-ec2-ip:3001 or your domain`
- **Backend API**: `http://your-ec2-ip:3002`
- **Ingest Service**: `http://your-ec2-ip:3000 or your sub domain`

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

### SSL/TLS Configuration (Caddy)
```bash
# สร้างไฟล์ Caddyfile
cat <<EOL > Caddyfile
your-domain.com {
    reverse_proxy frontend:3001
}

your-sub-domain.com {
    reverse_proxy backend:3002
}
EOL
```



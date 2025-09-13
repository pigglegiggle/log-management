# การติดตั้ง Log Management System แบบ Local

## Requirements เบื้องต้น (ขั้นต่ำ)

### Hardware Requirements 
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Storage**: 40 GB Disk

## การติดตั้งบน Local Machine

### ติดตั้ง Software ที่จำเป็น

#### สำหรับ macOS:
```bash
# ติดตั้ง Homebrew (ถ้ายังไม่มี)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# ติดตั้ง Docker Desktop
brew install --cask docker

# ติดตั้ง Node.js
brew install node

# ติดตั้ง Git
brew install git
```

#### สำหรับ Ubuntu/Linux:
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

# ติดตั้ง Git
sudo apt-get install -y git

# ตรวจสอบ versions
node --version
npm --version
docker --version
docker-compose --version

# รีสตาร์ท session (Linux เท่านั้น)
exit
# เข้า terminal ใหม่
```

#### สำหรับ Windows:
```bash
# ติดตั้ง Docker Desktop จาก https://www.docker.com/products/docker-desktop
# ติดตั้ง Node.js จาก https://nodejs.org
# ติดตั้ง Git จาก https://git-scm.com

# ตรวจสอบ versions ใน PowerShell/CMD
node --version
npm --version
docker --version
docker-compose --version
```

### Clone และ Setup Project

```bash
# Clone repository
git clone https://github.com/pigglegiggle/log-management.git
cd log-management
```


### Setup ระบบ
```bash
# Development mode
./Makefile/run_dev.sh
```

### ทดสอบการส่ง Log

```bash
cd samples

# ทดสอบส่ง log ตัวอย่าง
node post_log.js

# ทดสอบส่ง syslog
node send_syslog.js

# ทดสอบ login failure logs
node login_fail.js

# ทดสอบผ่าน json batch
./send_tenant.sh

# กลับไปยัง root directory
cd ..
```

## การเข้าถึงระบบ

### URLs สำหรับเข้าถึง
- **Frontend**: `http://localhost:3001`
- **Backend API**: `http://localhost:3002`
- **Ingest Service**: `http://localhost:3000`

### ตรวจสอบข้อมูลในหน้าเว็บ
1. เปิด http://localhost:3001
2. เข้าสู่ระบบ
3. ดูข้อมูล Log ที่เพิ่งส่งเข้ามา

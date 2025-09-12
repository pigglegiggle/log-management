#!/bin/bash
set -e
# ---------------------------
# สร้าง .env files สำหรับ production
# ---------------------------
echo "Creating production environment files..."

cat <<EOL > .env
MYSQL_DATABASE=logdb
MYSQL_ROOT_PASSWORD=1234
INGEST_URL=http://20.2.210.144:3000
EOL

cat <<EOL > backend/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234
JWT_SECRET=logdemo_secret_prod
NODE_ENV=production
PORT=3002
EOL

cat <<EOL > ingest/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234
NODE_ENV=production
PORT=3000
EOL

cat <<EOL > frontend/.env
NEXT_PUBLIC_API_URL=https://api-log.sinpw.site/
NODE_ENV=production
PORT=3001
INGEST_URL=http://20.2.210.144:3000
EOL

# ---------------------------
# Samples .env และติดตั้ง dependencies
# ---------------------------
cat <<EOL > samples/.env
INGEST_URL=http://20.2.210.144:3000
EOL

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "📦 Installing Node.js and npm..."
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Amazon Linux
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs npm
    elif command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew install node
    else
        echo "❌ Could not install npm. Please install Node.js manually."
        exit 1
    fi
    echo "✅ Node.js and npm installed"
fi

cd samples && npm install --silent --production && cd ..
echo "✅ Samples ready"

# ---------------------------
# เริ่มระบบแบบ production (clean rebuild)
# ---------------------------
docker-compose down -v --rmi all --remove-orphans
echo "✅ Cleaned old containers"

docker-compose up -d --build 
echo "✅ Containers built"

# ---------------------------
# รอ MySQL พร้อม
# ---------------------------
until docker-compose exec -T db mysql -u root -p1234 -e "SELECT 1;" &>/dev/null; do
  echo "  Still waiting for MySQL..."
  sleep 2
done
echo "✅ MySQL is ready!"

# ---------------------------
# สร้าง database schema
# ---------------------------
docker-compose exec -T db mysql -u root -p1234 logdb < database_schema.sql
echo "✅ Database schema applied"

# ---------------------------
# รีสตาร์ท backend และ ingest เพื่อให้เชื่อมต่อ database ใหม่
# ---------------------------
docker-compose restart backend ingest
echo "✅ Services restarted"

# ---------------------------
# รอให้ทุก services พร้อม
# ---------------------------
echo "⏳ Waiting for all services to be ready..."
sleep 10

# ---------------------------
# ตรวจสอบ services
# ---------------------------
echo "Testing services..."
curl -s https://api-log.sinpw.site/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/ingest -X POST -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet"  
curl -s https://log.sinpw.site/ >/dev/null && echo "✓ Frontend is responding" || echo "⚠ Frontend not responding yet"

echo ""
echo "🎉 PRODUCTION environment is ready!"
echo "   Frontend: https://log.sinpw.site/"
echo "   Backend:  https://api-log.sinpw.site/"
echo "   Ingest:   http://20.2.210.144:3000"
echo ""
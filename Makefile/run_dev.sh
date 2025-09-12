#!/bin/bash
set -e

# ---------------------------
# สร้าง .env files สำหรับ development
# ---------------------------
echo "Creating development environment files..."

cat <<EOL > .env
MYSQL_DATABASE=logdb
MYSQL_ROOT_PASSWORD=1234
INGEST_URL=http://localhost:3000
EOL

cat <<EOL > backend/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234
JWT_SECRET=logdemo_secret_dev
NODE_ENV=development
PORT=3002
EOL

cat <<EOL > ingest/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234
NODE_ENV=development
PORT=3000
EOL

cat <<EOL > frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3002
NODE_ENV=development
PORT=3001
INGEST_URL=http://localhost:3000
EOL

# ---------------------------
# Samples .env และติดตั้ง dependencies
# ---------------------------
cat <<EOL > samples/.env
INGEST_URL=http://localhost:3000
EOL

cd samples && npm install --silent && cd ..
echo "✅ Samples ready"

# ---------------------------
# เริ่มระบบแบบ development (มี volume mounting)
# ---------------------------
docker-compose down -v --rmi local --remove-orphans
echo "✅ Cleaned old containers in this folder"


docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --scale caddy=0
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
sleep 120

# ---------------------------
# ตรวจสอบ services
# ---------------------------
echo "Testing services..."
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/ingest -X POST -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet"  
curl -s http://localhost:3001/ >/dev/null && echo "✓ Frontend is responding" || echo "⚠ Frontend not responding yet"

echo ""
echo "🎉 DEVELOPMENT environment is ready!"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:3002"
echo "   Ingest:   http://localhost:3000"
echo ""

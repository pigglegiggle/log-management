#!/bin/bash
set -e

# ---------------------------
# สร้าง .env files
# ---------------------------
echo "📝 Creating environment files..."

cat <<EOL > .env
MYSQL_DATABASE=logdb
MYSQL_ROOT_PASSWORD=1234
MYSQL_USER=demo
MYSQL_PASSWORD=1234
EOL

cat <<EOL > backend/.env
DATABASE_URL=mysql://demo:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
JWT_SECRET=logdemo_secret
NODE_ENV=production
PORT=3002
EOL

cat <<EOL > ingest/.env
DATABASE_URL=mysql://demo:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
NODE_ENV=production
PORT=3000
EOL

cat <<EOL > frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3002
NODE_ENV=production
PORT=3001
EOL

# ---------------------------
# เริ่มระบบแบบ clean
# ---------------------------
echo "🧹 Cleaning up old containers..."
docker-compose down -v --rmi all --remove-orphans

echo "🔨 Building and starting services..."
docker-compose up -d --build --force-recreate

# ---------------------------
# รอ MySQL พร้อม
# ---------------------------
echo "⏳ Waiting for MySQL to be ready..."
until docker-compose exec -T db mysql -u root -p1234 -e "SELECT 1;" &>/dev/null; do
  echo "  Still waiting for MySQL..."
  sleep 2
done
echo "✅ MySQL is ready!"

# ---------------------------
# สร้าง database schema
# ---------------------------
echo "📄 Setting up database schema..."
docker-compose exec -T db mysql -u root -p1234 logdb < database_schema.sql
echo "✅ Database schema applied"

# ---------------------------
# รอให้ทุก services พร้อม
# ---------------------------
echo "⏳ Waiting for all services to be ready..."
sleep 5

# ---------------------------
# ตรวจสอบ services
# ---------------------------
echo "🔍 Testing services..."
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/health >/dev/null && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet"  
curl -s http://localhost:3001/ >/dev/null && echo "✓ Frontend is responding" || echo "⚠ Frontend not responding yet"

echo ""
echo "🎉 System is ready!"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:3002"
echo "   Ingest:   http://localhost:3000"

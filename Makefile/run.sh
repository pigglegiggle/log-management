#!/bin/bash
set -e

# ---------------------------
# Mai# ---------------------------
# รอ MySQL พร้อม (ใช้ root user)
# ---------------------------
echo "⏳ Waiting for MySQL to be ready..."
until docker-compose exec -T db mysql -u root -p1234 -e "SELECT 1;" &>/dev/null; do
  echo "  Still waiting for MySQL..."
  sleep 3
done
echo "✅ MySQL is ready!"

# ---------------------------
# Stop backend และ ingest ก่อนสร้าง schema
# ---------------------------
echo "🛑 Stopping backend and ingest services..."
docker-compose stop backend ingest

# ---------------------------
# รัน database_schema.sql (ใช้ root user)
# ---------------------------
echo "📄 Creating database schema..."
docker-compose exec -T db mysql -u root -p1234 logdb < database_schema.sql
echo "✅ Database schema applied"

# ---------------------------
# Force recreate backend และ ingest
# ---------------------------
echo "🚀 Force recreating backend and ingest services..."
docker-compose rm -f backend ingest
docker-compose up -d backend ingest
echo "✅ Services recreated"

# ---------------------------
# รอ services พร้อม
# ---------------------------
echo "⏳ Waiting for services to start..."
sleep 10docker-compose)
# ---------------------------
cat <<EOL > .env
MYSQL_DATABASE=logdb
MYSQL_ROOT_PASSWORD=1234
MYSQL_USER=demo
MYSQL_PASSWORD=1234
EOL

# ---------------------------
# Backend .env
# ---------------------------
cat <<EOL > backend/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
JWT_SECRET=logdemo_secret
NODE_ENV=production
PORT=3002
EOL

# ---------------------------
# Ingest .env
# ---------------------------
cat <<EOL > ingest/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
NODE_ENV=production
PORT=3000
EOL

# ---------------------------
# Frontend .env
# ---------------------------
cat <<EOL > frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3002
NODE_ENV=production
PORT=3001
EOL

# ---------------------------
# Clean rebuild และรัน Docker Compose
# ---------------------------
docker-compose down -v --rmi all --remove-orphans
docker-compose up -d --build --force-recreate

# ---------------------------
# รอ MySQL พร้อม
# ---------------------------
echo "⏳ Waiting for MySQL to be ready..."
until docker-compose exec -T db mysql -u demo -p1234 -e "SELECT 1;" &>/dev/null; do
  sleep 2
done
echo "✅ MySQL is ready!"

# ---------------------------
# รัน database_schema.sql
# ---------------------------
echo "📄 Creating database schema..."
docker-compose exec -T db mysql -u root -p1234 logdb < database_schema.sql
echo "✅ Database schema applied"

# ---------------------------
# Test services
# ---------------------------
echo "🔍 Testing services..."
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/health >/dev/null && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet"
curl -s http://localhost:3001/ >/dev/null && echo "✓ Frontend is responding" || echo "⚠ Frontend not responding yet"

echo ""
echo "=== Clean Rebuild Completed ==="

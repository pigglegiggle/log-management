#!/bin/bash
set -e

# ---------------------------
# Main .env (สำหรับ docker-compose)
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
docker-compose exec -T db mysql -u demo -p1234 logdb < database_schema.sql
echo "✅ Database schema applied"

# ---------------------------
# Test services
# ---------------------------
sleep 5
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/health >/dev/null && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet"

echo ""
echo "=== Clean Rebuild Completed ==="

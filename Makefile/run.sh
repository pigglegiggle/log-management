#!/bin/bash
set -e

# ----------------------------------------
# Script: run.sh
# Clean ทุกอย่างและ rebuild ใหม่หมด พร้อมสร้าง DB schema
# ----------------------------------------

docker-compose down -v

# Main .env
cat <<EOL > .env
MYSQL_DATABASE=logdb
MYSQL_ROOT_PASSWORD=1234
MYSQL_USER=demo
MYSQL_PASSWORD=1234
EOL

# Backend .env
cat <<EOL > backend/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
JWT_SECRET=logdemo_secret
NODE_ENV=development
PORT=3002
EOL

# Ingest .env
cat <<EOL > ingest/.env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=demo
DB_PASSWORD=1234
NODE_ENV=development
PORT=3000
EOL

# Frontend .env
cat <<EOL > frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3002
NODE_ENV=development
PORT=3001
EOL

rm -rf logs
mkdir -p logs

docker-compose up -d --build --force-recreate

# ---------------------------
# รอ MySQL พร้อมก่อน
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
echo "Step 10: Testing services..."
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"
curl -s http://localhost:3000/health >/dev/null && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet (normal if no health endpoint)"

echo ""
echo "=== Clean Rebuild Completed ==="
echo "Services are available at:"
echo "  • Backend API: http://localhost:3002"
echo "  • Frontend: http://localhost:3001"
echo "  • Ingest API: http://localhost:3000"
echo "  • Database: localhost:3306 (demo/1234)"
echo "Ready for testing! 🚀"

#!/bin/bash

# ----------------------------------------
# Script: run.sh
# ใช้สำหรับ clean ทุกอย่างและ rebuild ใหม่หมด
# ----------------------------------------

set -e  # ถ้าเกิด error ให้หยุด script ทันที

echo "=== Starting Clean Rebuild Process ==="

# --- Step 1: Stop และลบ containers ทั้งหมด ---
echo "Step 1: Stopping and removing all containers..."
docker-compose down --volumes --remove-orphans
echo "✓ All containers stopped and removed"

# --- Step 2: ลบ Docker images ทั้งหมดของโปรเจค ---
echo "Step 2: Removing project Docker images..."
docker rmi -f $(docker images -q log_management-* 2>/dev/null) 2>/dev/null || echo "No project images to remove"
echo "✓ Project images removed"

# --- Step 3: ลบ Docker cache ---
echo "Step 3: Cleaning Docker cache..."
docker system prune -af --volumes
echo "✓ Docker cache cleaned"

# --- Step 4: ลบ node_modules และ package-lock.json ---
echo "Step 4: Cleaning Node.js dependencies..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "package-lock.json" -type f -delete 2>/dev/null || true
echo "✓ Node.js dependencies cleaned"

# --- Step 5: สร้าง .env files ใหม่ ---
echo "Step 5: Creating fresh .env files..."

# Main .env
cat <<EOL > .env
# Database Configuration
MYSQL_ROOT_PASSWORD=1234
MYSQL_DATABASE=logdb
EOL

# Backend .env
cat <<EOL > backend/.env
# Database Configuration
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234

# JWT Configuration
JWT_SECRET=jwt_secret_key_2025

# Environment
NODE_ENV=development
PORT=3002
EOL

# Ingest .env
cat <<EOL > ingest/.env
# Database Configuration
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234

# Environment
NODE_ENV=development
PORT=3000
EOL

# Frontend .env
cat <<EOL > frontend/.env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_INGEST_URL=http://localhost:3000

# Environment
NODE_ENV=development
PORT=3001
EOL

echo "✓ Fresh .env files created"

# --- Step 6: สร้างโฟลเดอร์ logs ใหม่ ---
echo "Step 6: Creating logs directory..."
rm -rf logs
mkdir -p logs
echo "✓ Logs directory recreated"

# --- Step 7: Build และ Start ใหม่ ---
echo "Step 7: Building and starting fresh containers..."
docker-compose up -d --build --force-recreate
echo "✓ Fresh containers built and started"

# --- Step 8: รอให้ database พร้อม ---
echo "Step 8: Waiting for database to be ready..."
sleep 20

# Test database connection
echo "Testing database connection..."
for i in {1..10}; do
    if docker-compose exec -T db mysql -u root -p1234 -e "SELECT 1" >/dev/null 2>&1; then
        echo "✓ Database is ready"
        break
    else
        echo "Waiting for database... ($i/10)"
        sleep 3
    fi
done

# --- Step 9: Run database migration ---
echo "Step 9: Running database migration..."
if [ -f database_schema_safe.sql ]; then
    docker-compose exec -T db mysql -u root -p1234 logdb < database_schema.sql
    echo "✓ Database migration completed"
else
    echo "Warning: database_schema.sql not found"
fi

# --- Step 10: Test all services ---
echo "Step 10: Testing services..."

# Test database
echo "Testing database connection..."
docker-compose exec -T db mysql -u root -p1234 -e "USE logdb; SELECT 'Database OK' as status;" 2>/dev/null

# Test backend
echo "Testing backend service..."
sleep 5
curl -s http://localhost:3002/ >/dev/null && echo "✓ Backend is responding" || echo "⚠ Backend not responding yet"

# Test ingest
echo "Testing ingest service..."
curl -s http://localhost:3000/health >/dev/null && echo "✓ Ingest is responding" || echo "⚠ Ingest not responding yet (normal if no health endpoint)"

echo ""
echo "=== Clean Rebuild Completed ==="
echo "Services are available at:"
echo "  • Backend API: http://localhost:3002"
echo "  • Frontend: http://localhost:3001"
echo "  • Ingest API: http://localhost:3000"
echo "  • Database: localhost:3306 (root/1234)"
echo ""
echo "Database includes:"
echo "  • Empty sources table (auto-populated on log ingestion)"
echo "  • Pre-configured users: admin/admin, demoA/demoA, demoB/demoB"
echo "  • Tenant tables: logs_demoA, logs_demoB"
echo ""
echo "Ready for testing! 🚀"

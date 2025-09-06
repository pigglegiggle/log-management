#!/bin/bash

# ----------------------------------------
# Script: run.sh
# ใช้สำหรับตั้งค่า environment และรัน Docker Compose
# ----------------------------------------

set -e  # ถ้าเกิด error ให้หยุด script ทันที

# --- Step 1: สร้าง .env ถ้ายังไม่มี ---
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat <<EOL > .env
DATABASE_URL=mysql://root:1234@db:3306/logdb
DB_NAME=logdb
DB_HOST=db
DB_USER=root
DB_PASSWORD=1234
EOL
else
  echo ".env file already exists"
fi

# --- Step 2: สร้างโฟลเดอร์ logs ถ้ายังไม่มี ---
mkdir -p logs
echo "Logs directory is ready"

# --- Step 3: Build และ Start Docker Compose ---
echo "Building and starting containers..."
docker-compose up -d --build

echo "Ingest service is ready to accept logs"
echo "All services are up and running!"

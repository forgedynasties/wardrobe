#!/bin/bash

set -e

echo "🚀 Starting Wardrobe App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}docker-compose not found${NC}"
    exit 1
fi

# Start database
echo -e "${YELLOW}📦 Starting PostgreSQL...${NC}"
docker-compose up -d

sleep 2

# Set up environment
export DATABASE_URL="postgres://wardrobe:wardrobe@localhost:5432/wardrobe?sslmode=disable"

# Start backend in background
echo -e "${YELLOW}🔧 Starting backend...${NC}"
go run cmd/server/main.go &
BACKEND_PID=$!

sleep 2

# Start frontend in background
echo -e "${YELLOW}⚛️  Starting frontend...${NC}"
cd web
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}✅ App started!${NC}"
echo ""
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down; exit" SIGINT

# Wait for processes
wait

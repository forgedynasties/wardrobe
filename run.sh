#!/bin/bash

set -e

echo "🚀 Starting Wardrobe App..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v docker &> /dev/null; then
    echo -e "${RED}docker not found${NC}"
    exit 1
fi

COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE="docker-compose"
    else
        echo -e "${RED}docker compose not found${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}📦 Building + starting db and backend...${NC}"
$COMPOSE up -d --build

LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}')
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$LAN_IP" ]; then
    LAN_IP="localhost"
fi
echo -e "${YELLOW}📡 LAN IP: ${LAN_IP}${NC}"

echo -e "${YELLOW}⚛️  Starting frontend...${NC}"
cd web
npm install > /dev/null 2>&1
NEXT_PUBLIC_API_URL=http://${LAN_IP}:8081 npm run dev -- -H 0.0.0.0 &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}✅ App started!${NC}"
echo ""
echo "Backend:  http://${LAN_IP}:8081"
echo "Frontend: http://${LAN_IP}:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

trap "kill $FRONTEND_PID 2>/dev/null; $COMPOSE down; exit" SIGINT

wait

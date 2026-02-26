#!/bin/bash

# Local Development Setup Script
# This script automates the setup process for local development

set -e  # Exit on error

echo "🚀 Setting up RealWorld QA Automation Framework for local development..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "📦 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) is installed${NC}"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps
echo -e "${GREEN}✅ Playwright browsers installed${NC}"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file for local development..."
    cp .env.local .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping...${NC}"
fi
echo ""

# Start Docker containers
echo "🐳 Starting application with Docker..."
cd app
docker compose up -d
cd ..
echo -e "${GREEN}✅ Docker containers started${NC}"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Health check
echo "🏥 Checking application health..."
FRONTEND_OK=false
BACKEND_OK=false

if curl -s http://localhost:4200 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:4200${NC}"
    FRONTEND_OK=true
else
    echo -e "${YELLOW}⚠️  Frontend not responding yet${NC}"
fi

if curl -s http://localhost:8000/api/tags > /dev/null; then
    echo -e "${GREEN}✅ Backend API is running on http://localhost:8000/api${NC}"
    BACKEND_OK=true
else
    echo -e "${YELLOW}⚠️  Backend API not responding yet${NC}"
fi
echo ""
if [ "$FRONTEND_OK" = false ] || [ "$BACKEND_OK" = false ]; then
    echo -e "${RED}❌ One or more services failed to start. Please check Docker logs.${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup complete! Here's what you can do next:"
echo ""
echo "  📱 View Application:"
echo "     Frontend: http://localhost:4200"
echo "     Backend:  http://localhost:8000/api"
echo ""
echo "  🧪 Run Tests:"
echo "     npm test                     # All tests"
echo "     npm run test:ui              # Interactive mode"
echo "     npm run test:headed          # See browser"
echo "     npm run test:debug           # Debug mode"
echo "     npm run test:core            # Run core user journey tests"
echo "     npm run test:auth            # Run authentication tests"
echo "     npm run test:articles        # Run articles tests"
echo "     npm run test:feed            # Run feed tests"
echo ""
echo "  📊 View Results:"
echo "     npm run report:open"
echo ""
echo "  🔧 Manage Application:"
echo "     npm run app:stop             # Stop containers"
echo "     npm run app:restart          # Restart containers"
echo ""
echo "  📚 Documentation:"
echo "     README.md - Complete framework documentation"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

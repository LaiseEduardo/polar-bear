#!/bin/bash

# Test Runner Script - Verifies local app is running and executes tests
# Usage: ./run-tests.sh [optional: test arguments]

set -e

echo "🔍 Checking if local application is running..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if containers are running
BACKEND_RUNNING=$(docker ps --filter "name=backend" --filter "status=running" -q)
FRONTEND_RUNNING=$(docker ps --filter "name=frontend" --filter "status=running" -q)

if [ -z "$BACKEND_RUNNING" ] || [ -z "$FRONTEND_RUNNING" ]; then
    echo "⚠️  Application containers not running. Starting them now..."
    cd app
    docker compose up -d
    cd ..
    echo "⏳ Waiting 30 seconds for services to start..."
    sleep 30
fi

# Health check function
check_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "✅ $name is ready"
            return 0
        fi
        echo "   Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 3
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name is not responding after $max_attempts attempts"
    return 1
}

# Check frontend
check_service "http://localhost:4200" "Frontend"
FRONTEND_OK=$?

# Check backend
check_service "http://localhost:8000/api/tags" "Backend API"
BACKEND_OK=$?

if [ $FRONTEND_OK -ne 0 ] || [ $BACKEND_OK -ne 0 ]; then
    echo ""
    echo "❌ Application is not ready. Check logs with: npm run app:logs"
    exit 1
fi

echo ""
echo "✅ Application is ready!"
echo "🧪 Running tests..."
echo ""

# Run tests with any passed arguments
if [ -z "$1" ]; then
    # No arguments, run all tests
    dotenv -e .env -- npx playwright test
else
    # Pass all arguments to playwright
    dotenv -e .env -- npx playwright test "$@"
fi

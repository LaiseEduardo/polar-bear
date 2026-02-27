#!/bin/bash

# Test Runner Script using wait-on package
# Uses wait-on for robust service readiness detection with exponential backoff
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
fi

echo "⏳ Waiting for services to be ready..."

# Use wait-on to wait for both services (max 60 seconds)
# wait-on is smarter: it uses exponential backoff and proper HTTP checks
# add   --verbose \ for debugging if needed
npx wait-on \
  --timeout 60000 \
  --interval 1000 \
  --window 2000 \
  http://localhost:4200 \
  http://localhost:8000/api/tags

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Application is ready!"
    echo "🧪 Running tests..."
    echo ""
    
    # Run tests with any passed arguments
    if [ -z "$1" ]; then
        dotenv -e .env -- npx playwright test
    else
        dotenv -e .env -- npx playwright test "$@"
    fi
else
    echo ""
    echo "❌ Application failed to become ready in time"
    echo "Check logs with: npm run app:logs"
    exit 1
fi

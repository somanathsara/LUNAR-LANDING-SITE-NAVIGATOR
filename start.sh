#!/bin/bash
# Lunar Landing Site Navigator - Quick Start Script

set -e

echo "🌙 Lunar Landing Site Navigator - Starting up..."
echo ""

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "🔍 Checking prerequisites..."
check_command node
check_command npm
check_command python3
check_command pip3

echo "✅ All prerequisites found"
echo ""

# Setup backend
echo "🐍 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "  Installing dependencies..."
pip install -q -r requirements.txt

echo "  Downloading SPICE kernels..."
python scripts/download_kernels.py

cd ..

# Setup frontend
echo ""
echo "⚛️  Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
fi

cd ..

echo ""
echo "✨ Setup complete! Starting servers..."
echo ""

# Start backend in background
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🚀 Servers starting..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '👋 Servers stopped'; exit 0" INT
wait
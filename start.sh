#!/bin/bash

echo "=========================================="
echo "Starting MSME Credit Intelligence Platform"
echo "=========================================="

# Start Python AI Engine
echo "Starting Python AI Engine (FastAPI)..."
gnome-terminal -- bash -c "
cd ai_service || exit
echo 'Starting Python AI Engine on port 8080...'
./venv/bin/python main.py
exec bash
"

# Start Express Backend
echo "Starting Node.js Express Backend API..."
gnome-terminal -- bash -c "
cd backend || exit
echo 'Starting Express Backend on port 5000...'
npm start
exec bash
"

# Start React Frontend
echo "Starting React Vite Frontend Client..."
gnome-terminal -- bash -c "
cd frontend || exit
echo 'Starting Vite Dev Server on port 5173...'
npm run dev
exec bash
"

echo "=========================================="
echo "All services launched in separate windows!"
echo "AI Service : http://127.0.0.1:8080"
echo "Backend API: http://localhost:5000"
echo "Frontend   : http://localhost:5173"
echo "=========================================="

read -p "Press Enter to exit..."

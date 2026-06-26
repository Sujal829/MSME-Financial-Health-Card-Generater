@echo off
echo ==========================================
echo Starting MSME Credit Intelligence Platform
echo ==========================================

:: Start Python AI Engine
echo Starting Python AI Engine (FastAPI)...
start cmd /k "cd ai_service && echo Starting Python AI Engine on port 8000... && .\venv\Scripts\python main.py"

:: Start Express Backend
echo Starting Node.js Express Backend API...
start cmd /k "cd backend && echo Starting Express Backend on port 5000... && npm start"

:: Start React Frontend
echo Starting React Vite Frontend Client...
start cmd /k "cd frontend && echo Starting Vite Dev Server on port 5173... && npm run dev"

echo ==========================================
echo All services launched in separate windows!
echo - AI Service: http://127.0.0.1:8000
echo - Backend API: http://localhost:5000
echo - Frontend App: http://localhost:5173
echo ==========================================
pause

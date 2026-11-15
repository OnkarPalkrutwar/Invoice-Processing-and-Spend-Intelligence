@echo off
echo ======================================================================
echo   Launching InvoScan: Invoice Processing & Spend Intelligence
echo ======================================================================
echo.
echo Starting Python OCR Service (Port 8000)...
start "InvoScan OCR Service" cmd /k "cd ocr-service && .\venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo Starting Node.js Express Backend (Port 5000)...
start "InvoScan Express Backend" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak > nul

echo Starting Vite React Frontend (Port 5173)...
start "InvoScan React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo - Frontend:  http://localhost:5173
echo - Backend:   http://localhost:5000/api/health
echo - OCR API:   http://localhost:8000
echo.
echo Opening browser at http://localhost:5173...
start http://localhost:5173
echo.
echo Demo Accounts:
echo - Admin:    admin@invoscan.com   / admin123
echo - Finance:  finance@invoscan.com / finance123
echo - Employee: employee@invoscan.com/ employee123
echo ======================================================================
pause

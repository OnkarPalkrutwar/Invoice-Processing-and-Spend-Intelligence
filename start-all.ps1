Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Launching InvoScan: Invoice Processing & Spend Intelligence Workspace" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. OCR Service
Write-Host "`n[1/3] Starting Python OCR Service on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\ocr-service'; .\venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Backend
Write-Host "[2/3] Starting Express Backend on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Frontend
Write-Host "[3/3] Starting Vite Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host "`nAll three services launched in separate windows!" -ForegroundColor Green
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:    http://localhost:5000" -ForegroundColor White
Write-Host "  Python OCR: http://localhost:8000" -ForegroundColor White
Write-Host "  MongoDB:    mongodb://127.0.0.1:27017/invoice_spend_intelligence" -ForegroundColor White

Start-Process "http://localhost:5173"

Write-Host "`nDemo Accounts:" -ForegroundColor Magenta
Write-Host "  Admin:    admin@invoscan.com   / admin123"
Write-Host "  Finance:  finance@invoscan.com / finance123"
Write-Host "  Employee: employee@invoscan.com/ employee123"

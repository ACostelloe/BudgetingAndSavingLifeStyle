# PowerShell script to start the backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location server
$env:NODE_ENV = "development"
npm run dev


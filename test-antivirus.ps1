# Antivirus Test Script for Tech Book Reader

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Antivirus Test" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Remove existing Electron
Write-Host "[Step 1/5] Removing existing Electron..." -ForegroundColor Yellow
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader\electron" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "OK Removed`n" -ForegroundColor Green

# Step 2: Reinstall
Write-Host "[Step 2/5] Reinstalling Electron..." -ForegroundColor Yellow
npm run install-electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Installation failed" -ForegroundColor Red
    exit 1
}

# Step 3: Check immediately (0 seconds)
Write-Host "`n[Step 3/5] Checking immediately after installation..." -ForegroundColor Yellow
$path = "$env:USERPROFILE\.tech-book-reader\electron\27.3.11\electron.exe"
if (Test-Path $path) {
    Write-Host "OK electron.exe exists (0 seconds)" -ForegroundColor Green
} else {
    Write-Host "ERROR: electron.exe not found (0 seconds)" -ForegroundColor Red
    Write-Host "  Installation may have failed`n" -ForegroundColor Yellow
    exit 1
}

# Step 4: Wait 5 seconds
Write-Host "`n[Step 4/5] Waiting 5 seconds (antivirus scan time)..." -ForegroundColor Yellow
for ($i = 5; $i -gt 0; $i--) {
    Write-Host "  $i seconds remaining..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Step 5: Check again
Write-Host "`n[Step 5/5] Checking after 5 seconds..." -ForegroundColor Yellow
if (Test-Path $path) {
    Write-Host "SUCCESS: electron.exe still exists!" -ForegroundColor Green
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "SUCCESS! Exclusion is working!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "You can now start the app with:" -ForegroundColor White
    Write-Host "  npm start`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "ERROR: electron.exe was deleted" -ForegroundColor Red
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "WARNING: Exclusion is NOT working" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "1. Windows Defender exclusion not added correctly" -ForegroundColor White
    Write-Host "2. Other antivirus software is running" -ForegroundColor White
    Write-Host "3. Exclusion needs time to take effect`n" -ForegroundColor White
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Security -> Exclusions" -ForegroundColor White
    Write-Host "2. Verify this path is in the exclusion list:" -ForegroundColor White
    Write-Host "   C:\Users\varuv\.tech-book-reader" -ForegroundColor Cyan
    Write-Host "3. Restart PC and run this script again`n" -ForegroundColor White
    exit 1
}



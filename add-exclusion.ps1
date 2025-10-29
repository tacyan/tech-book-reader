#Requires -RunAsAdministrator

# Windows Defender除外設定追加スクリプト

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Windows Defender 除外設定追加" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$exclusionPath = "$env:USERPROFILE\.tech-book-reader"

Write-Host "追加する除外パス:" -ForegroundColor White
Write-Host "  $exclusionPath`n" -ForegroundColor Cyan

# 現在の除外設定を確認
Write-Host "[ステップ 1/3] 現在の除外設定を確認中..." -ForegroundColor Yellow
$currentExclusions = (Get-MpPreference).ExclusionPath
if ($currentExclusions) {
    Write-Host "✓ 現在の除外設定:" -ForegroundColor Green
    foreach ($path in $currentExclusions) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  除外設定がありません" -ForegroundColor Yellow
}
Write-Host ""

# 除外設定を追加
Write-Host "[ステップ 2/3] 除外設定を追加中..." -ForegroundColor Yellow
try {
    Add-MpPreference -ExclusionPath $exclusionPath
    Write-Host "✓ 除外設定を追加しました`n" -ForegroundColor Green
} catch {
    Write-Host "❌ 除外設定の追加に失敗しました" -ForegroundColor Red
    Write-Host "   エラー: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# 追加後の除外設定を確認
Write-Host "[ステップ 3/3] 追加後の除外設定を確認中..." -ForegroundColor Yellow
$newExclusions = (Get-MpPreference).ExclusionPath
if ($newExclusions -contains $exclusionPath) {
    Write-Host "✅ 除外設定が正常に追加されました！`n" -ForegroundColor Green
    Write-Host "除外パス一覧:" -ForegroundColor White
    foreach ($path in $newExclusions) {
        if ($path -eq $exclusionPath) {
            Write-Host "  ✓ $path (新規追加)" -ForegroundColor Green
        } else {
            Write-Host "  - $path" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ 除外設定の確認に失敗しました`n" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 完了！" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "1. この管理者PowerShellを閉じる" -ForegroundColor White
Write-Host "2. 通常のPowerShellで以下を実行:" -ForegroundColor White
Write-Host "   .\test-antivirus.ps1`n" -ForegroundColor Cyan


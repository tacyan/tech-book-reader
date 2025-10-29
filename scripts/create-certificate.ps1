# Tech Book Reader Code Signing Certificate Creator
# Requires Windows PowerShell (Run as Administrator recommended)

Write-Host "Creating self-signed certificate for Tech Book Reader..." -ForegroundColor Cyan
Write-Host ""

# Certificate storage path
$certPath = "$env:USERPROFILE\.tech-book-reader\certificate"
$pfxPath = "$certPath\TechBookReader.pfx"
$cerPath = "$certPath\TechBookReader.cer"

# Create directory
New-Item -ItemType Directory -Force -Path $certPath | Out-Null

# Certificate password
$password = ConvertTo-SecureString -String "TechBookReader2024" -Force -AsPlainText

Write-Host "Certificate Details:" -ForegroundColor Yellow
Write-Host "  Subject: CN=Tech Book Reader" -ForegroundColor Gray
Write-Host "  Validity: 10 years" -ForegroundColor Gray
Write-Host "  Location: $certPath" -ForegroundColor Gray
Write-Host ""

# Create self-signed certificate
Write-Host "Creating certificate..." -ForegroundColor Cyan
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=Tech Book Reader, O=Tech Book Reader, C=JP" `
    -FriendlyName "Tech Book Reader Code Signing" `
    -NotAfter (Get-Date).AddYears(10) `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyLength 4096 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256

Write-Host "Certificate created successfully" -ForegroundColor Green
Write-Host ""

# Export PFX (includes private key)
Write-Host "Exporting certificate..." -ForegroundColor Cyan
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
Write-Host "PFX file: $pfxPath" -ForegroundColor Green

# Export CER (public key only)
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
Write-Host "CER file: $cerPath" -ForegroundColor Green
Write-Host ""

# Add to Trusted Root Certification Authorities
Write-Host "Adding certificate to Trusted Root..." -ForegroundColor Cyan
Write-Host "(This operation requires administrator privileges)" -ForegroundColor Yellow
Write-Host ""

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    Write-Host "Certificate added to trusted store" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Failed to add certificate to trusted store: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please add manually (see instructions below)" -ForegroundColor Yellow
    Write-Host ""
}

# Save thumbprint
$thumbprint = $cert.Thumbprint
$thumbprint | Out-File -FilePath "$certPath\thumbprint.txt" -Encoding UTF8

Write-Host "Certificate Information:" -ForegroundColor Cyan
Write-Host "  Thumbprint: $thumbprint" -ForegroundColor Gray
Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
Write-Host "  Expiration: $($cert.NotAfter)" -ForegroundColor Gray
Write-Host ""

Write-Host "Certificate creation completed!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. npm run sign-electron" -ForegroundColor White
Write-Host "   Sign Electron binary" -ForegroundColor Gray
Write-Host ""
Write-Host "2. npm start" -ForegroundColor White
Write-Host "   Start application" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Certificate Password: TechBookReader2024" -ForegroundColor Cyan
Write-Host "(Used in sign-electron.js)" -ForegroundColor Gray
Write-Host ""

# Generate iOS Distribution .p12 from .cer + private key on Windows
# Prereq: distribution.cer downloaded to C:\Users\User\Desktop\AppleCSR\
# Output: distribution.p12 with password set below + base64 string copied to clipboard

$ErrorActionPreference = 'Stop'
$openssl = 'D:\Git\usr\bin\openssl.exe'
$dir     = "$HOME\Desktop\AppleCSR"
$pass    = 'royalcoffee2026'

if (-not (Test-Path "$dir\distribution.cer")) {
    Write-Error "distribution.cer not found in $dir. Download it from Apple Developer Portal first."
}

Push-Location $dir
& $openssl x509 -inform DER -in distribution.cer -out distribution.pem
& $openssl pkcs12 -export -inkey apple_private.key -in distribution.pem -out distribution.p12 -passout "pass:$pass" -legacy
Pop-Location

Write-Host "[OK] distribution.p12 created with password: $pass" -ForegroundColor Green

# Base64 encode and copy to clipboard
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$dir\distribution.p12"))
$b64 | Set-Clipboard
Write-Host "[OK] Base64 of distribution.p12 copied to clipboard ($($b64.Length) chars)" -ForegroundColor Green
Write-Host "    Paste it into Codemagic as env var: CM_CERTIFICATE (Secure)" -ForegroundColor Yellow

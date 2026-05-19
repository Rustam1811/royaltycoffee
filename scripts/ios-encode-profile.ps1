# Base64-encode the downloaded .mobileprovision and copy to clipboard
$ErrorActionPreference = 'Stop'
$dir = "$HOME\Desktop\AppleCSR"

$profile = Get-ChildItem -Path $dir -Filter *.mobileprovision | Select-Object -First 1
if (-not $profile) {
    Write-Error "No .mobileprovision file found in $dir. Download it from Apple Developer Portal first."
}

Write-Host "[*] Using profile: $($profile.Name)" -ForegroundColor Cyan

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($profile.FullName))
$b64 | Set-Clipboard

Write-Host "[OK] Base64 of profile copied to clipboard ($($b64.Length) chars)" -ForegroundColor Green
Write-Host "    Paste it into Codemagic as env var: CM_PROVISIONING_PROFILE (Secure)" -ForegroundColor Yellow

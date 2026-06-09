#Requires -Version 5.1
# ──────────────────────────────────────────────────────────────
# Signaturmonster Installer — Windows (PowerShell)
# Usage: iex (irm https://raw.githubusercontent.com/choldermann/signaturmonster/main/install.ps1)
# ──────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step  { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "  [X]  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  Signaturmonster Installer" -ForegroundColor Yellow
Write-Host "  Self-hosted SMTP Proxy  -  signaturmonster.de" -ForegroundColor Gray
Write-Host ""

# ── Docker pruefen ────────────────────────────────────────────
try {
    $null = docker compose version 2>&1
    Write-Ok "Docker gefunden"
} catch {
    Write-Err "Docker nicht gefunden."
    Write-Host "  Installiere Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    exit 1
}

# ── Installationsverzeichnis ──────────────────────────────────
$defaultDir = "$env:USERPROFILE\signaturmonster"
Write-Host ""
$customDir = Read-Host "  Installationsverzeichnis [$defaultDir]"
$installDir = if ($customDir) { $customDir } else { $defaultDir }

New-Item -ItemType Directory -Force -Path $installDir       | Out-Null
New-Item -ItemType Directory -Force -Path "$installDir\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$installDir\nginx"| Out-Null
Set-Location $installDir

# ── Ports abfragen ────────────────────────────────────────────
Write-Host ""
$smtpPortRaw = Read-Host "  Port fuer Thunderbird/Mailprogramm [2587]"
$smtpPort    = if ($smtpPortRaw) { $smtpPortRaw } else { "2587" }
$httpPortRaw = Read-Host "  Port fuer das Web-Dashboard        [8080]"
$httpPort    = if ($httpPortRaw) { $httpPortRaw } else { "8080" }

# Zufaelliger Secret Key
$chars     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%^&*_'
$secretKey = -join (1..48 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

# ── Dateien herunterladen ─────────────────────────────────────
$base = "https://raw.githubusercontent.com/choldermann/signaturmonster/main"
Write-Host ""
Write-Step "Lade Konfigurationsdateien von GitHub..."
Invoke-WebRequest "$base/docker-compose.yml" -OutFile "docker-compose.yml" -UseBasicParsing
Invoke-WebRequest "$base/nginx/nginx.conf"   -OutFile "nginx\nginx.conf"   -UseBasicParsing
Write-Ok "docker-compose.yml und nginx.conf geladen"

# ── .env schreiben ────────────────────────────────────────────
@"
# Signaturmonster Konfiguration - generiert von install.ps1
RELAY_HOST=
RELAY_PORT=587
RELAY_USER=
RELAY_PASS=
SMTP_PORT=$smtpPort
HTTP_PORT=$httpPort
SECRET_KEY=$secretKey
GITHUB_TOKEN=
LEXWARE_API_TOKEN=
"@ | Set-Content ".env" -Encoding UTF8
Write-Ok ".env erstellt"

# ── Container starten ─────────────────────────────────────────
Write-Host ""
Write-Step "Lade Container-Images (beim ersten Mal einige Minuten)..."
docker compose pull
docker compose up -d

# ── Ergebnis ─────────────────────────────────────────────────
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.*' } |
    Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  Signaturmonster laeuft!" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard:  http://${localIp}:${httpPort}" -ForegroundColor Cyan
Write-Host "  SMTP-Port:  ${localIp}:${smtpPort}   <- in Thunderbird eintragen" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Dateien:    $installDir" -ForegroundColor Gray
Write-Host "  Logs:       docker compose logs -f  (im Installationsverzeichnis)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Dokumentation: https://signaturmonster.de/docs" -ForegroundColor Gray
Write-Host ""

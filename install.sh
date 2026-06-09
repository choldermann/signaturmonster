#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Signaturmonster Installer — Linux & macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/choldermann/signaturmonster/main/install.sh | bash
# ──────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}✉  Signaturmonster Installer${NC}"
echo -e "   Self-hosted SMTP Proxy · signaturmonster.de"
echo ""

# ── Check Docker ──────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo -e "${RED}✗ Docker nicht gefunden.${NC}"
    echo "  Installiere Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
if ! docker compose version &>/dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose nicht gefunden.${NC}"
    echo "  Docker Desktop oder das Compose-Plugin wird benötigt."
    exit 1
fi
echo -e "${GREEN}✓ Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) gefunden${NC}"

# ── Installationsverzeichnis ──────────────────────────────────
DEFAULT_DIR="${HOME}/signaturmonster"
echo ""
read -p "Installationsverzeichnis [${DEFAULT_DIR}]: " CUSTOM_DIR </dev/tty
INSTALL_DIR="${CUSTOM_DIR:-$DEFAULT_DIR}"

mkdir -p "${INSTALL_DIR}/data"
mkdir -p "${INSTALL_DIR}/nginx"
cd "${INSTALL_DIR}"

# ── Ports abfragen ────────────────────────────────────────────
echo ""
read -p "Port für Thunderbird/Mailprogramm [2587]: " SMTP_PORT </dev/tty; SMTP_PORT="${SMTP_PORT:-2587}"
read -p "Port für das Web-Dashboard        [8080]: " HTTP_PORT </dev/tty; HTTP_PORT="${HTTP_PORT:-8080}"

# Zufälligen Secret Key generieren
SECRET_KEY=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#%^&*_+=' </dev/urandom 2>/dev/null | head -c 48 || \
             openssl rand -hex 24 2>/dev/null || \
             echo "changeme-$(date +%s)")

# ── Dateien herunterladen ─────────────────────────────────────
BASE="https://raw.githubusercontent.com/choldermann/signaturmonster/main"
echo ""
echo "Lade Konfigurationsdateien von GitHub..."
curl -fsSL "${BASE}/docker-compose.yml" -o docker-compose.yml
curl -fsSL "${BASE}/nginx/nginx.conf"   -o nginx/nginx.conf
echo -e "${GREEN}✓ docker-compose.yml und nginx.conf geladen${NC}"

# ── .env schreiben ────────────────────────────────────────────
printf '# Signaturmonster Konfiguration — generiert von install.sh\nRELAY_HOST=\nRELAY_PORT=587\nRELAY_USER=\nRELAY_PASS=\nSMTP_PORT=%s\nHTTP_PORT=%s\nSECRET_KEY=%s\nGITHUB_TOKEN=\nLEXWARE_API_TOKEN=\n' \
    "${SMTP_PORT}" "${HTTP_PORT}" "${SECRET_KEY}" > .env
echo -e "${GREEN}✓ .env erstellt${NC}"

# ── Container starten ─────────────────────────────────────────
echo ""
echo "Lade Container-Images (das kann beim ersten Mal einige Minuten dauern)..."
docker compose pull
docker compose up -d

# ── Ergebnis anzeigen ─────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}✓ Signaturmonster läuft!${NC}"
echo ""
echo -e "  Dashboard:  ${BLUE}http://${LOCAL_IP}:${HTTP_PORT}${NC}"
echo -e "  SMTP-Port:  ${YELLOW}${LOCAL_IP}:${SMTP_PORT}${NC}  ← in Thunderbird eintragen"
echo ""
echo -e "  Dateien:    ${INSTALL_DIR}"
echo -e "  Logs:       ${YELLOW}docker compose logs -f${NC}  (im Installationsverzeichnis)"
echo ""
echo -e "  Dokumentation: https://signaturmonster.de/docs"
echo ""

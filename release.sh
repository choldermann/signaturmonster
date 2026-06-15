#!/bin/bash
set -e

VERSION=${1:-$(cat VERSION)}

GIT_SHA=$(git rev-parse HEAD)
GIT_MSG=$(git log -1 --format="%s")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ -z "$VERSION" ]]; then
  echo "Usage: ./release.sh <version>  (e.g. ./release.sh 0.9.0)"
  exit 1
fi

echo "=== Release v$VERSION ==="

# VERSION-Datei + .env aktualisieren
echo "$VERSION" > VERSION
if grep -q "^APP_VERSION=" .env 2>/dev/null; then
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$VERSION/" .env
else
  echo "" >> .env && echo "APP_VERSION=$VERSION" >> .env
fi

# VERSION in Build-Kontexte kopieren (wird ins Image gebacken)
cp VERSION backend/VERSION
cp VERSION smtp-proxy/VERSION
trap 'rm -f backend/VERSION smtp-proxy/VERSION' EXIT

# Images mit Versions-Tag und :latest bauen
echo ""
echo "--- Building images ---"
docker build --build-arg APP_VERSION="$VERSION" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  --label "git.commit.message=${GIT_MSG}" \
  --label "org.opencontainers.image.created=${BUILD_DATE}" \
  -t "ghcr.io/choldermann/signaturmonster-backend:$VERSION" \
  -t "ghcr.io/choldermann/signaturmonster-backend:latest" \
  ./backend

docker build --build-arg APP_VERSION="$VERSION" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  --label "git.commit.message=${GIT_MSG}" \
  --label "org.opencontainers.image.created=${BUILD_DATE}" \
  -t "ghcr.io/choldermann/signaturmonster-smtp-proxy:$VERSION" \
  -t "ghcr.io/choldermann/signaturmonster-smtp-proxy:latest" \
  ./smtp-proxy

docker build --build-arg APP_VERSION="$VERSION" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  --label "git.commit.message=${GIT_MSG}" \
  --label "org.opencontainers.image.created=${BUILD_DATE}" \
  -t "ghcr.io/choldermann/signaturmonster-frontend:$VERSION" \
  -t "ghcr.io/choldermann/signaturmonster-frontend:latest" \
  ./frontend

# Images pushen (:latest + :version)
echo ""
echo "--- Pushing images ---"
docker push "ghcr.io/choldermann/signaturmonster-backend:$VERSION"
docker push "ghcr.io/choldermann/signaturmonster-backend:latest"
docker push "ghcr.io/choldermann/signaturmonster-smtp-proxy:$VERSION"
docker push "ghcr.io/choldermann/signaturmonster-smtp-proxy:latest"
docker push "ghcr.io/choldermann/signaturmonster-frontend:$VERSION"
docker push "ghcr.io/choldermann/signaturmonster-frontend:latest"

# Git: VERSION committen + Tag setzen
echo ""
echo "--- Git commit & tag ---"
git add VERSION
git commit -m "Release: v$VERSION

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin main
git push origin "v$VERSION"

echo ""
echo "=== Released v$VERSION successfully! ==="

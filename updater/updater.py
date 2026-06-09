import subprocess, os, logging, json
import requests
from flask import Flask, jsonify, Response, stream_with_context

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

COMPOSE_FILE  = os.getenv("COMPOSE_FILE", "/project/docker-compose.yml")
GITHUB_REPO   = os.getenv("GITHUB_REPO", "choldermann/signaturmonster")
GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN", "")
REGISTRY      = "ghcr.io"
OWNER         = GITHUB_REPO.split("/")[0]
REF_IMAGE     = f"{REGISTRY}/{OWNER}/signaturmonster-backend"
REF_CONTAINER = "sm-backend"


def _anon_token(repo_path: str) -> str:
    r = requests.get(
        f"https://{REGISTRY}/token",
        params={"service": REGISTRY, "scope": f"repository:{repo_path}:pull"},
        timeout=10,
    )
    return r.json().get("token", "")


def _registry_labels(image: str, tag: str = "latest") -> dict:
    repo_path = image.removeprefix(f"{REGISTRY}/")
    token = _anon_token(repo_path)
    h = {
        "Authorization": f"Bearer {token}",
        "Accept": (
            "application/vnd.oci.image.index.v1+json,"
            "application/vnd.oci.image.manifest.v1+json,"
            "application/vnd.docker.distribution.manifest.v2+json,"
            "application/vnd.docker.distribution.manifest.list.v2+json"
        ),
    }
    manifest = requests.get(
        f"https://{REGISTRY}/v2/{repo_path}/manifests/{tag}", headers=h, timeout=10
    ).json()

    # OCI Index / Docker Manifest List: pick first manifest (linux/amd64 or any)
    if "manifests" in manifest:
        platforms = manifest["manifests"]
        chosen = next(
            (m for m in platforms if (m.get("platform") or {}).get("os") != "unknown"),
            platforms[0],
        )
        sub = requests.get(
            f"https://{REGISTRY}/v2/{repo_path}/manifests/{chosen['digest']}",
            headers={**h, "Accept": "application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.v2+json"},
            timeout=10,
        ).json()
        manifest = sub

    digest = (manifest.get("config") or {}).get("digest", "")
    if not digest:
        return {}
    config = requests.get(
        f"https://{REGISTRY}/v2/{repo_path}/blobs/{digest}", headers=h, timeout=10
    ).json()
    return (config.get("config") or {}).get("Labels") or {}


def _local_labels(container: str) -> dict:
    try:
        raw = subprocess.check_output(
            ["docker", "inspect", "--format", "{{json .Config.Labels}}", container],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        return json.loads(raw) or {}
    except Exception:
        return {}


def _gh_headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


@app.get("/version")
def version():
    try:
        cur      = _local_labels(REF_CONTAINER)
        cur_sha  = (cur.get("org.opencontainers.image.revision") or "")[:7]
        cur_msg  = cur.get("git.commit.message", "")
        cur_date = (cur.get("org.opencontainers.image.created") or "")[:10]

        try:
            lat      = _registry_labels(REF_IMAGE, "latest")
            lat_sha  = (lat.get("org.opencontainers.image.revision") or "")[:7]
            lat_msg  = lat.get("git.commit.message", "")
            lat_date = (lat.get("org.opencontainers.image.created") or "")[:10]
            up_to_date = bool(cur_sha and cur_sha == lat_sha)
        except Exception:
            lat_sha, lat_msg, lat_date = cur_sha, cur_msg, cur_date
            up_to_date = True

        behind = 0
        if not up_to_date and cur_sha and lat_sha:
            try:
                data = requests.get(
                    f"https://api.github.com/repos/{GITHUB_REPO}/compare/{cur_sha}...{lat_sha}",
                    headers=_gh_headers(), timeout=10,
                ).json()
                behind = data.get("ahead_by", 1)
            except Exception:
                behind = 1

        return jsonify({
            "current":         cur_sha  or "—",
            "current_message": cur_msg,
            "current_date":    cur_date,
            "latest":          lat_sha  or "—",
            "latest_message":  lat_msg,
            "latest_date":     lat_date,
            "up_to_date":      up_to_date,
            "behind":          behind,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/changelog")
def changelog():
    try:
        cur_sha = (_local_labels(REF_CONTAINER).get("org.opencontainers.image.revision") or "")[:7]
        lat_sha = (_registry_labels(REF_IMAGE, "latest").get("org.opencontainers.image.revision") or "")[:7]

        if not cur_sha or not lat_sha or cur_sha == lat_sha:
            return jsonify([])

        data = requests.get(
            f"https://api.github.com/repos/{GITHUB_REPO}/compare/{cur_sha}...{lat_sha}",
            headers=_gh_headers(), timeout=10,
        ).json()
        commits = data.get("commits", [])
        return jsonify([{
            "hash":    c["sha"][:7],
            "message": c["commit"]["message"].split("\n")[0],
            "date":    c["commit"]["committer"]["date"][:10],
        } for c in reversed(commits)])
    except Exception:
        return jsonify([])


@app.post("/update")
def update():
    try:
        pull = subprocess.check_output(
            ["docker", "compose", "-f", COMPOSE_FILE, "pull"],
            stderr=subprocess.STDOUT,
        ).decode()
        logger.info("docker compose pull done")

        services = ["backend", "frontend", "smtp-proxy", "nginx"]

        # "compose down [services]" stops AND removes in one atomic step —
        # more reliable than separate stop+rm which can leave containers
        # in a transitional state.
        subprocess.check_output(
            ["docker", "compose", "-f", COMPOSE_FILE, "down"] + services,
            stderr=subprocess.STDOUT,
        )
        logger.info("old containers removed")

        for svc in services:
            subprocess.check_output(
                ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "--no-deps", svc],
                stderr=subprocess.STDOUT,
            )
        logger.info("services restarted")

        subprocess.Popen(
            ["docker", "compose", "-f", COMPOSE_FILE, "stop", "updater"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        subprocess.Popen(
            ["docker", "compose", "-f", COMPOSE_FILE, "rm", "-f", "updater"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        subprocess.Popen(
            ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "updater"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return jsonify({"ok": True, "pull_output": pull})
    except subprocess.CalledProcessError as e:
        return jsonify({"ok": False, "error": e.output.decode()}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.post("/update/stream")
def update_stream():
    def _evt(step: str, msg: str, detail: str = "") -> str:
        return f"data: {json.dumps({'step': step, 'msg': msg, 'detail': detail})}\n\n"

    def _ps() -> str:
        r = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True, text=True,
        )
        return r.stdout.strip() or "(keine Container)"

    def _rm(name: str) -> str:
        r = subprocess.run(["docker", "rm", "-f", name], capture_output=True, text=True)
        return f"rm -f {name}: {(r.stdout + r.stderr).strip() or 'ok'}"

    def _up(svc: str) -> str:
        r = subprocess.run(
            ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "--no-deps", svc],
            capture_output=True, text=True,
        )
        out = (r.stdout + r.stderr).strip()
        if r.returncode != 0:
            raise subprocess.CalledProcessError(r.returncode, f"up {svc}", out.encode())
        return out

    def generate():
        # backend first — smtp-proxy/frontend/nginx depend on it
        services        = ["backend", "frontend", "smtp-proxy", "nginx"]
        container_names = ["sm-backend", "sm-frontend", "sm-smtp", "sm-nginx"]
        try:
            yield _evt("pull", "Lade neue Images von GitHub...")
            subprocess.check_output(
                ["docker", "compose", "-f", COMPOSE_FILE, "pull"],
                stderr=subprocess.STDOUT,
            )
            yield _evt("pull_ok", "Images geladen")

            yield _evt("rm", "Stoppe und entferne alte Container...")
            ps_before = _ps()
            yield _evt("rm", "Zustand VOR Entfernen", ps_before)
            rm_log = [_rm(n) for n in container_names]
            ps_after = _ps()
            yield _evt("rm_ok", "Alte Container entfernt",
                       "\n".join(rm_log) + "\n\nNach rm:\n" + ps_after)

            yield _evt("up", "Starte neue Container...")
            for svc in services:
                ps_pre = _ps()
                out = _up(svc)
                ps_post = _ps()
                yield _evt("up", f"Gestartet: {svc}",
                           f"Output: {out}\n\nVorher:\n{ps_pre}\n\nNachher:\n{ps_post}")
            yield _evt("up_ok", "Backend · Frontend · Nginx gestartet")

            yield _evt("self", "Starte Updater neu...")
            subprocess.Popen(
                ["docker", "rm", "-f", "sm-updater"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            subprocess.Popen(
                ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "--no-deps", "updater"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            yield _evt("done", "Update abgeschlossen")

        except subprocess.CalledProcessError as e:
            err = e.output.decode() if isinstance(e.output, bytes) else str(e.output)
            yield _evt("error", "Fehler beim Update", err[-600:])
        except Exception as e:
            yield _evt("error", str(e))

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000)

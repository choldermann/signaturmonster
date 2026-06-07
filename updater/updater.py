import subprocess, os, logging
from flask import Flask, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PROJECT_DIR  = os.getenv("PROJECT_DIR",  "/project")
COMPOSE_FILE = os.getenv("COMPOSE_FILE", f"{PROJECT_DIR}/docker-compose.yml")

# Git weigert sich auf Verzeichnisse zuzugreifen deren Owner nicht dem laufenden
# User entspricht (Sicherheitsfeature seit Git 2.35.2). Da der Container als root
# läuft, das Host-Verzeichnis aber einem anderen User gehört, muss die Ausnahme
# explizit gesetzt werden.
subprocess.run(
    ["git", "config", "--global", "--add", "safe.directory", PROJECT_DIR],
    check=True,
)


def _git(*args):
    return subprocess.check_output(
        ["git", "-C", PROJECT_DIR, *args], stderr=subprocess.DEVNULL
    ).decode().strip()


def _fetch():
    _git("fetch", "--quiet", "origin", "main")


@app.get("/version")
def version():
    try:
        _fetch()
    except Exception:
        pass
    try:
        current       = _git("rev-parse", "--short", "HEAD")
        current_msg   = _git("log", "-1", "--pretty=%s")
        current_date  = _git("log", "-1", "--pretty=%ci")[:10]
        try:
            latest      = _git("rev-parse", "--short", "origin/main")
            latest_msg  = _git("log", "-1", "--pretty=%s",  "origin/main")
            latest_date = _git("log", "-1", "--pretty=%ci", "origin/main")[:10]
            behind = int(_git("rev-list", "--count", "HEAD..origin/main"))
        except Exception:
            latest = current; latest_msg = current_msg; latest_date = current_date; behind = 0
        return jsonify({
            "current": current, "current_message": current_msg, "current_date": current_date,
            "latest":  latest,  "latest_message":  latest_msg,  "latest_date":  latest_date,
            "up_to_date": behind == 0, "behind": behind,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/changelog")
def changelog():
    try:
        _fetch()
        raw = subprocess.check_output(
            ["git", "-C", PROJECT_DIR, "log",
             "--pretty=format:%h\t%s\t%ci", "HEAD..origin/main"],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        result = []
        if raw:
            for line in raw.splitlines():
                parts = line.split("\t", 2)
                if len(parts) == 3:
                    result.append({"hash": parts[0], "message": parts[1], "date": parts[2][:10]})
        return jsonify(result)
    except Exception:
        return jsonify([])


@app.post("/update")
def update():
    try:
        pull = subprocess.check_output(
            ["git", "-C", PROJECT_DIR, "pull", "origin", "main"],
            stderr=subprocess.STDOUT,
        ).decode()
        logger.info(f"git pull: {pull.strip()}")
        subprocess.Popen(
            ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d", "--build"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return jsonify({"ok": True, "pull_output": pull})
    except subprocess.CalledProcessError as e:
        return jsonify({"ok": False, "error": e.output.decode()}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.get("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000)

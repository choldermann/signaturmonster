//! Signaturmonster Viewer: Desktop-Fenster + Tray-Icon (Status) für den lokalen
//! (oder entfernten) Signaturmonster-Service. Die Oberfläche selbst kommt vom
//! Service – der Viewer ist nur eine dünne Hülle.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::time::Duration;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_URL: &str = "http://127.0.0.1:8080";
const POLL: Duration = Duration::from_secs(5);

/// Linux: ~/.config/signaturmonster/viewer.conf, macOS: ~/Library/Application
/// Support/Signaturmonster/viewer.conf, Windows: %APPDATA%\Signaturmonster\viewer.conf
fn config_file() -> Option<PathBuf> {
    let env = |k: &str| std::env::var_os(k).map(PathBuf::from);
    let dir = if cfg!(windows) {
        env("APPDATA")?.join("Signaturmonster")
    } else if cfg!(target_os = "macos") {
        env("HOME")?.join("Library/Application Support/Signaturmonster")
    } else {
        env("XDG_CONFIG_HOME").or_else(|| env("HOME").map(|h| h.join(".config")))?.join("signaturmonster")
    };
    Some(dir.join("viewer.conf"))
}

/// Adresse des Dienstes: SM_VIEWER_URL > viewer.conf (url=...) > Standard.
fn service_url() -> Url {
    let from_file = || {
        let text = std::fs::read_to_string(config_file()?).ok()?;
        text.lines().find_map(|l| l.trim().strip_prefix("url=").map(|v| v.trim().to_string()))
    };
    std::env::var("SM_VIEWER_URL")
        .ok()
        .or_else(from_file)
        .and_then(|u| Url::parse(&u).ok())
        .unwrap_or_else(|| Url::parse(DEFAULT_URL).unwrap())
}

/// Prüft, ob unter der Adresse wirklich Signaturmonster antwortet – ein
/// offener Port allein reicht nicht (dort kann ein anderes Programm laufen).
fn service_online(url: &Url) -> bool {
    let Some(host) = url.host_str() else { return false };
    let port = url.port_or_known_default().unwrap_or(80);
    let Some(addr) = (host, port).to_socket_addrs().ok().and_then(|mut a| a.next()) else { return false };
    let Ok(mut sock) = TcpStream::connect_timeout(&addr, Duration::from_secs(1)) else { return false };
    if url.scheme() == "https" {
        return true; // ohne TLS-Client nur Erreichbarkeit prüfbar
    }
    let _ = sock.set_read_timeout(Some(Duration::from_secs(2)));
    let req = format!("GET /api/version HTTP/1.0\r\nHost: {host}\r\nConnection: close\r\n\r\n");
    let mut resp = Vec::new();
    sock.write_all(req.as_bytes()).is_ok()
        && sock.take(16 * 1024).read_to_end(&mut resp).is_ok()
        && String::from_utf8_lossy(&resp).contains("\"product\":\"signaturmonster\"")
}

fn show_main(app: &AppHandle) {
    let url = service_url();
    let target = if service_online(&url) { WebviewUrl::External(url) } else { WebviewUrl::App("index.html".into()) };

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
        if let WebviewUrl::External(u) = target {
            // War offline und ist jetzt erreichbar → auf die echte UI wechseln
            if win.url().map(|cur| cur.origin() != u.origin()).unwrap_or(true) {
                let _ = win.navigate(u);
            }
        }
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "main", target)
        .title("Signaturmonster")
        .inner_size(1280.0, 860.0)
        .min_inner_size(900.0, 600.0)
        .build();
}

fn open_in_browser(url: &Url) {
    let u = url.as_str();
    let _ = if cfg!(windows) {
        std::process::Command::new("cmd").args(["/C", "start", "", u]).spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(u).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(u).spawn()
    };
}

fn main() {
    tauri::Builder::default()
        // Muss das erste Plugin sein: Ein zweiter Start holt nur das vorhandene
        // Fenster nach vorn – wichtig auf Desktops ohne sichtbaren Tray.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .setup(|app| {
            let status = MenuItem::with_id(app, "status", "Status wird geprüft …", false, None::<&str>)?;
            let open = MenuItem::with_id(app, "open", "Signaturmonster öffnen", true, None::<&str>)?;
            let browser = MenuItem::with_id(app, "browser", "Im Browser öffnen", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Viewer beenden", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&status, &sep, &open, &browser, &sep, &quit])?;

            let tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("Icon fehlt"))
                .tooltip("Signaturmonster")
                .menu(&menu)
                .on_menu_event(|app, ev| match ev.id().as_ref() {
                    "open" => show_main(app),
                    "browser" => open_in_browser(&service_url()),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Ein schlafender Hintergrund-Thread aktualisiert den Status und
            // wechselt von der Offline-Seite auf die echte UI, sobald der Dienst da ist.
            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                let url = service_url();
                let online = service_online(&url);
                let text = if online {
                    format!("● Dienst läuft ({})", url.host_str().unwrap_or("?"))
                } else {
                    format!("○ Dienst nicht erreichbar ({})", url.host_str().unwrap_or("?"))
                };
                let _ = status.set_text(&text);
                let _ = tray.set_tooltip(Some(format!("Signaturmonster – {text}")));
                if let Some(win) = handle.get_webview_window("main") {
                    let on_local_page = win.url().is_ok_and(|u| !matches!(u.scheme(), "http" | "https"));
                    if online && on_local_page {
                        let _ = win.navigate(url);
                    }
                }
                std::thread::sleep(POLL);
            });

            show_main(app.handle());
            Ok(())
        })
        // Schließen beendet den Viewer (Standardverhalten). Bewusst kein
        // "in den Tray minimieren": Ohne sichtbaren Tray wäre die App sonst
        // unerreichbar. Der Dienst läuft unabhängig davon weiter.
        .run(tauri::generate_context!())
        .expect("Viewer konnte nicht gestartet werden");
}

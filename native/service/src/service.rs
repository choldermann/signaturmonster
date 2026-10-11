//! Installation als Systemdienst: systemd (Linux), launchd (macOS), SCM (Windows).

use std::ffi::OsString;

use anyhow::{Context, Result};
use service_manager::{
    RestartPolicy, ServiceInstallCtx, ServiceLabel, ServiceLevel, ServiceManager, ServiceStartCtx, ServiceStopCtx,
    ServiceUninstallCtx,
};

/// Unter Windows ist das zugleich der SCM-Dienstname.
pub const LABEL: &str = "de.monstersuite.signaturmonster";

pub fn manage(cmd: &str) -> Result<()> {
    let label: ServiceLabel = LABEL.parse()?;
    let mut mgr = <dyn ServiceManager>::native().context("Kein unterstützter Dienst-Manager gefunden")?;
    mgr.set_level(ServiceLevel::System).context("Systemweite Dienste werden nicht unterstützt")?;

    let hint = "– als Administrator bzw. mit sudo ausführen?";
    match cmd {
        "install" => {
            // Windows startet die Binary mit "service", damit sie sich beim SCM meldet.
            let args: Vec<OsString> = vec![if cfg!(windows) { "service" } else { "run" }.into()];
            mgr.install(ServiceInstallCtx {
                label: label.clone(),
                program: std::env::current_exe()?,
                args,
                contents: None,
                username: None,
                working_directory: None,
                environment: std::env::var("SM_DATA_DIR").ok().map(|d| vec![("SM_DATA_DIR".into(), d)]),
                autostart: true,
                restart_policy: RestartPolicy::OnFailure { delay_secs: Some(5), max_retries: None, reset_after_secs: None },
            })
            .with_context(|| format!("Installation fehlgeschlagen {hint}"))?;
            mgr.start(ServiceStartCtx { label }).with_context(|| format!("Start fehlgeschlagen {hint}"))?;
            println!("Dienst '{LABEL}' installiert und gestartet.");
        }
        "uninstall" => {
            let _ = mgr.stop(ServiceStopCtx { label: label.clone() });
            mgr.uninstall(ServiceUninstallCtx { label }).with_context(|| format!("Deinstallation fehlgeschlagen {hint}"))?;
            println!("Dienst '{LABEL}' entfernt. Die Daten bleiben erhalten.");
        }
        "start" => mgr.start(ServiceStartCtx { label }).with_context(|| format!("Start fehlgeschlagen {hint}"))?,
        "stop" => mgr.stop(ServiceStopCtx { label }).with_context(|| format!("Stopp fehlgeschlagen {hint}"))?,
        _ => unreachable!(),
    }
    Ok(())
}

#[cfg(windows)]
pub mod windows {
    use std::ffi::OsString;
    use std::sync::Mutex;
    use std::time::Duration;

    use anyhow::Result;
    use windows_service::service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType,
    };
    use windows_service::service_control_handler::{self, ServiceControlHandlerResult};
    use windows_service::{define_windows_service, service_dispatcher};

    use super::LABEL;

    define_windows_service!(ffi_service_main, service_main);

    pub fn dispatch() -> Result<()> {
        service_dispatcher::start(LABEL, ffi_service_main)?;
        Ok(())
    }

    fn service_main(_args: Vec<OsString>) {
        if let Err(e) = run() {
            tracing::error!("Dienst beendet mit Fehler: {e:#}");
        }
    }

    fn status(state: ServiceState, controls: ServiceControlAccept) -> ServiceStatus {
        ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: state,
            controls_accepted: controls,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        }
    }

    fn run() -> Result<()> {
        let cfg = crate::config::Config::load()?;
        std::fs::create_dir_all(&cfg.data_dir)?;
        // Ohne Konsole: Log in Datei im Datenverzeichnis
        crate::init_logging(Some(cfg.data_dir.join("service.log")));

        let (tx, rx) = tokio::sync::oneshot::channel();
        let tx = Mutex::new(Some(tx));
        let handle = service_control_handler::register(LABEL, move |ev| match ev {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                if let Some(tx) = tx.lock().unwrap().take() {
                    let _ = tx.send(());
                }
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        })?;

        handle.set_service_status(status(
            ServiceState::Running,
            ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        ))?;
        let result = crate::run_blocking(cfg, Some(rx));
        handle.set_service_status(status(ServiceState::Stopped, ServiceControlAccept::empty()))?;
        result
    }
}

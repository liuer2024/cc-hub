mod config;
use config::{AppConfig, Config};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_config() -> AppConfig {
    AppConfig::load()
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    config.save()
}

#[tauri::command]
fn create_provider(name: String, alias: String) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.add_provider(name, alias)?;
    Ok(config)
}

#[tauri::command]
fn add_config(provider_id: String, config_item: Config) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.add_config(provider_id, config_item)?;
    Ok(config)
}

#[tauri::command]
fn activate_config(provider_id: String, config_id: String) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.activate_config(provider_id, config_id)?;
    Ok(config)
}

#[tauri::command]
fn update_config(provider_id: String, config_item: Config) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.update_config(provider_id, config_item)?;
    Ok(config)
}

#[tauri::command]
fn delete_config(provider_id: String, config_id: String) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.delete_config(provider_id, config_id)?;
    Ok(config)
}

#[tauri::command]
fn delete_provider(provider_id: String) -> Result<AppConfig, String> {
    let mut config = AppConfig::load();
    config.delete_provider(provider_id)?;
    Ok(config)
}

#[tauri::command]
fn export_config(path: String) -> Result<(), String> {
    let config = AppConfig::load();
    config.export_to_file(path)
}

#[tauri::command]
fn import_config(path: String) -> Result<AppConfig, String> {
    AppConfig::import_from_file(path)
}

#[tauri::command]
fn launch_terminal(provider_id: String) -> Result<(), String> {
    let config = AppConfig::load();
    if let Some(provider) = config.providers.iter().find(|p| p.id == provider_id) {
        // Check if provider has an active config
        if provider.active_config_id.is_none() {
            return Err(format!("请先为 {} 添加并激活一个配置", provider.name));
        }

        let config_dir = AppConfig::get_config_dir();
        let bin_dir = config_dir.join("bin");

        // Check if the claude wrapper script exists
        let script_name = format!("claude-{}", provider.alias);
        let script_path = bin_dir.join(&script_name);
        if !script_path.exists() {
            return Err(format!("配置脚本不存在。请确保已激活 {} 的配置。", provider.name));
        }

        // Create a temporary init script to set up the environment
        let init_script_name = format!("init_{}.sh", provider.alias);
        let init_script_path = bin_dir.join(&init_script_name);

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());

        let init_content = format!(
            r#"#!/bin/bash
export PATH="{}:$PATH"
echo "----------------------------------------"
echo "CC Hub Environment: {}"
echo "Starting claude-{}..."
echo "----------------------------------------"
claude-{}
# After claude exits, start an interactive shell
exec {}
"#,
            bin_dir.to_string_lossy(),
            provider.name,
            provider.alias,
            provider.alias,
            shell
        );

        std::fs::write(&init_script_path, init_content).map_err(|e| e.to_string())?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&init_script_path).map_err(|e| e.to_string())?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&init_script_path, perms).map_err(|e| e.to_string())?;
        }
        
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg("-a")
                .arg("Terminal")
                .arg(&init_script_path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        
        #[cfg(target_os = "windows")]
        {
             // Windows logic: Auto-execute claude command
             std::process::Command::new("cmd")
                .arg("/C")
                .arg("start")
                .arg("cmd")
                .arg("/k")
                .arg(format!("set PATH={};%PATH% && echo ---------------------------------------- && echo CC Hub Environment: {} && echo Starting claude-{}... && echo ---------------------------------------- && claude-{}",
                    bin_dir.to_string_lossy(), provider.name, provider.alias, provider.alias))
                .spawn()
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    } else {
        Err("Provider not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_config,
            save_config,
            create_provider,
            delete_provider,
            add_config,
            activate_config,
            launch_terminal,
            update_config,
            delete_config,
            export_config,
            import_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub id: String,
    pub name: String, // e.g., "Monthly Plan"
    pub api_key: String,
    pub base_url: String,
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Provider {
    pub id: String,
    pub name: String,   // e.g., "Doubao"
    pub alias: String,  // e.g., "doubao" -> used for command "claude-doubao"
    pub configs: Vec<Config>,
    pub active_config_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    pub providers: Vec<Provider>,
}

impl AppConfig {
    pub fn get_config_dir() -> PathBuf {
        let home_dir = dirs::home_dir().expect("Could not find home directory");
        home_dir.join(".cc-hub")
    }

    pub fn get_config_path() -> PathBuf {
        Self::get_config_dir().join("config.json")
    }

    pub fn load() -> Self {
        let config_path = Self::get_config_path();
        if config_path.exists() {
            let content = fs::read_to_string(config_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let config_dir = Self::get_config_dir();
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
        }
        
        // Also create the providers directory structure
        let providers_dir = config_dir.join("providers");
        if !providers_dir.exists() {
            fs::create_dir_all(&providers_dir).map_err(|e| e.to_string())?;
        }

        // Create bin directory
        let bin_dir = config_dir.join("bin");
        if !bin_dir.exists() {
            fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
        }

        let config_path = Self::get_config_path();
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(config_path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn add_provider(&mut self, name: String, alias: String) -> Result<Provider, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let provider = Provider {
            id: id.clone(),
            name,
            alias: alias.clone(),
            configs: Vec::new(),
            active_config_id: None,
        };
        
        // Create provider specific config dir
        let provider_dir = Self::get_config_dir().join("providers").join(&alias);
        if !provider_dir.exists() {
            fs::create_dir_all(&provider_dir).map_err(|e| e.to_string())?;
        }

        self.providers.push(provider.clone());
        self.save()?;
        Ok(provider)
    }

    pub fn add_config(&mut self, provider_id: String, mut config: Config) -> Result<(), String> {
        if let Some(provider) = self.providers.iter_mut().find(|p| p.id == provider_id) {
            config.id = uuid::Uuid::new_v4().to_string();
            provider.configs.push(config);
            self.save()?;
            Ok(())
        } else {
            Err("Provider not found".to_string())
        }
    }

    pub fn activate_config(&mut self, provider_id: String, config_id: String) -> Result<(), String> {
        let config_dir = Self::get_config_dir();
        let bin_dir = config_dir.join("bin");

        if let Some(provider) = self.providers.iter_mut().find(|p| p.id == provider_id) {
            if let Some(config) = provider.configs.iter().find(|c| c.id == config_id) {
                provider.active_config_id = Some(config_id.clone());
                
                // Generate Script
                let script_name = format!("claude-{}", provider.alias);
                let script_path = bin_dir.join(&script_name);
                
                let provider_config_dir = config_dir.join("providers").join(&provider.alias);
                let provider_config_dir_str = provider_config_dir.to_string_lossy();

                // Ensure provider config dir exists
                if !provider_config_dir.exists() {
                    fs::create_dir_all(&provider_config_dir).map_err(|e| e.to_string())?;
                }

                // Create .claude directory for project-level settings
                let claude_dir = provider_config_dir.join(".claude");
                if !claude_dir.exists() {
                    fs::create_dir_all(&claude_dir).map_err(|e| e.to_string())?;
                }

                // Generate settings.json content
                let mut settings = serde_json::json!({
                    "env": {
                        "ANTHROPIC_AUTH_TOKEN": config.api_key,
                        "ANTHROPIC_BASE_URL": config.base_url
                    }
                });

                // Add model if specified
                if let Some(model) = &config.model {
                    settings["model"] = serde_json::json!(model);
                }

                let settings_content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
                let settings_path = claude_dir.join("settings.json");
                fs::write(&settings_path, settings_content).map_err(|e| e.to_string())?;

                // Generate wrapper script that changes to provider directory
                let script_content = format!(
                    r#"#!/usr/bin/env bash
# Generated by cc-hub for {}
cd "{}" || exit 1
echo "CC-Hub: Using config from {}"
exec "claude" "$@"
"#,
                    provider.name,
                    provider_config_dir_str,
                    settings_path.to_string_lossy()
                );

                fs::write(&script_path, script_content).map_err(|e| e.to_string())?;
                
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let mut perms = fs::metadata(&script_path).map_err(|e| e.to_string())?.permissions();
                    perms.set_mode(0o755);
                    fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
                }

                self.save()?;
                Ok(())
            } else {
                Err("Config not found".to_string())
            }
        } else {
            Err("Provider not found".to_string())
        }
    }

    pub fn update_config(&mut self, provider_id: String, config_item: Config) -> Result<(), String> {
        let mut should_reactivate = false;
        
        if let Some(provider) = self.providers.iter_mut().find(|p| p.id == provider_id) {
            if let Some(config) = provider.configs.iter_mut().find(|c| c.id == config_item.id) {
                *config = config_item.clone();
                if provider.active_config_id.as_ref() == Some(&config.id) {
                    should_reactivate = true;
                }
            } else {
                return Err("Config not found".to_string());
            }
        } else {
            return Err("Provider not found".to_string());
        }
        
        self.save()?;
        
        if should_reactivate {
            self.activate_config(provider_id, config_item.id)?;
        }
        
        Ok(())
    }

    /// Clean up settings.json and wrapper script for a provider
    pub fn cleanup_provider_files(&self, provider_alias: &str) -> Result<(), String> {
        let config_dir = Self::get_config_dir();

        // Remove .claude/settings.json
        let settings_path = config_dir.join("providers").join(provider_alias).join(".claude").join("settings.json");
        if settings_path.exists() {
            fs::remove_file(&settings_path).map_err(|e| format!("Failed to remove settings.json: {}", e))?;
        }

        // Remove .claude directory if empty
        let claude_dir = config_dir.join("providers").join(provider_alias).join(".claude");
        if claude_dir.exists() {
            if let Ok(mut entries) = fs::read_dir(&claude_dir) {
                if entries.next().is_none() {
                    // Directory is empty, remove it
                    fs::remove_dir(&claude_dir).ok();
                }
            }
        }

        // Remove wrapper script
        let script_name = format!("claude-{}", provider_alias);
        let script_path = config_dir.join("bin").join(&script_name);
        if script_path.exists() {
            fs::remove_file(&script_path).map_err(|e| format!("Failed to remove wrapper script: {}", e))?;
        }

        Ok(())
    }

    pub fn delete_config(&mut self, provider_id: String, config_id: String) -> Result<(), String> {
        if let Some(provider) = self.providers.iter_mut().find(|p| p.id == provider_id) {
            if let Some(pos) = provider.configs.iter().position(|c| c.id == config_id) {
                let was_active = provider.active_config_id.as_ref() == Some(&config_id);
                let provider_alias = provider.alias.clone();

                provider.configs.remove(pos);

                if was_active {
                    provider.active_config_id = None;
                    // Clean up env file and wrapper script when deleting active config
                    self.cleanup_provider_files(&provider_alias)?;
                }

                self.save()?;
                Ok(())
            } else {
                Err("Config not found".to_string())
            }
        } else {
            Err("Provider not found".to_string())
        }
    }

    pub fn export_to_file(&self, path: String) -> Result<(), String> {
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn import_from_file(path: String) -> Result<Self, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        config.save()?;
        Ok(config)
    }

    pub fn delete_provider(&mut self, provider_id: String) -> Result<(), String> {
        if let Some(pos) = self.providers.iter().position(|p| p.id == provider_id) {
            let provider = &self.providers[pos];
            let provider_alias = provider.alias.clone();

            // Clean up provider files
            self.cleanup_provider_files(&provider_alias)?;

            // Remove provider directory
            let config_dir = Self::get_config_dir();
            let provider_dir = config_dir.join("providers").join(&provider_alias);
            if provider_dir.exists() {
                fs::remove_dir_all(&provider_dir).map_err(|e| format!("Failed to remove provider directory: {}", e))?;
            }

            // Remove provider from list
            self.providers.remove(pos);
            self.save()?;
            Ok(())
        } else {
            Err("Provider not found".to_string())
        }
    }
}

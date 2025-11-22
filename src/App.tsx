import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppConfig, Config } from "./types";
import { Plus, Terminal, Settings, Trash2, Edit2, Play, X } from "lucide-react";
import { AddProviderModal } from "./components/AddProviderModal";
import { AddConfigModal } from "./components/AddConfigModal";
import SettingsModal from "./components/SettingsModal";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
  const [isAddConfigModalOpen, setIsAddConfigModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);

  // Settings State
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  useEffect(() => {
    loadConfig();
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply custom theme colors if needed
    if (theme === 'blue' || theme === 'purple') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  async function loadConfig() {
    try {
      const cfg = await invoke<AppConfig>("load_config");
      setConfig(cfg);
      if (cfg.providers.length > 0 && !activeProviderId) {
        setActiveProviderId(cfg.providers[0].id);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  }

  const activeProvider = config?.providers.find((p) => p.id === activeProviderId);

  async function handleLaunchTerminal(providerId: string) {
    try {
      await invoke("launch_terminal", { providerId });
    } catch (error) {
      console.error("Failed to launch terminal:", error);
      alert(t("启动终端失败: ", "Failed to launch terminal: ") + error);
    }
  }

  async function handleActivateConfig(providerId: string, configId: string) {
    try {
      const newConfig = await invoke<AppConfig>("activate_config", { providerId, configId });
      setConfig(newConfig);
    } catch (error) {
      console.error("Failed to activate config:", error);
      alert(t("激活配置失败: ", "Failed to activate config: ") + error);
    }
  }

  async function handleDeleteConfig(providerId: string, configId: string) {
    if (!confirm(t("确定要删除此配置吗？", "Are you sure you want to delete this config?"))) return;
    try {
      const newConfig = await invoke<AppConfig>("delete_config", { providerId, configId });
      setConfig(newConfig);
    } catch (error) {
      console.error("Failed to delete config:", error);
      alert(t("删除配置失败: ", "Failed to delete config: ") + error);
    }
  }

  function handleEditConfig(config: Config) {
    setEditingConfig(config);
    setIsAddConfigModalOpen(true);
  }

  function handleAddConfig() {
    setEditingConfig(null);
    setIsAddConfigModalOpen(true);
  }

  async function handleDeleteProvider(providerId: string) {
    if (!confirm(t("确定要删除此供应商吗？这将删除该供应商的所有配置。", "Are you sure you want to delete this provider? This will delete all its configurations."))) return;
    try {
      const newConfig = await invoke<AppConfig>("delete_provider", { providerId });
      setConfig(newConfig);
      // If the deleted provider was active, switch to the first available provider
      if (activeProviderId === providerId) {
        if (newConfig.providers.length > 0) {
          setActiveProviderId(newConfig.providers[0].id);
        } else {
          setActiveProviderId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete provider:", error);
      alert(t("删除供应商失败: ", "Failed to delete provider: ") + error);
    }
  }

  // Simple translation helper
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;

  return (
    <div className={`h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200`}>
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-md">
            <Terminal size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight dark:text-white">CC Hub</span>
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-2xl py-2">
          {config?.providers.map((provider) => (
            <div key={provider.id} className="relative group px-1">
              <button
                onClick={() => setActiveProviderId(provider.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeProviderId === provider.id
                  ? "bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900 dark:text-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  }`}
              >
                {provider.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProvider(provider.id);
                }}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
                title={t("删除供应商", "Delete Provider")}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setIsAddProviderModalOpen(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t("添加供应商", "Add Provider")}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeProvider ? (
          <div className="max-w-4xl mx-auto">
            {/* Provider Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{activeProvider.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {t("命令: ", "Command: ")} <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">claude-{activeProvider.alias}</code>
                </p>
              </div>
              <button
                onClick={() => handleLaunchTerminal(activeProvider.id)}
                disabled={!activeProvider.active_config_id}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-transform ${
                  activeProvider.active_config_id
                    ? "bg-green-600 hover:bg-green-700 text-white active:scale-95"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                }`}
                title={!activeProvider.active_config_id ? t("请先添加并激活一个配置", "Please add and activate a config first") : ""}
              >
                <Play size={20} fill="currentColor" />
                <span>{t("启动终端", "Launch Terminal")}</span>
              </button>
            </div>

            {/* Configurations List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t("配置列表", "Configurations")}</h3>
                <button
                  onClick={handleAddConfig}
                  className="text-sm text-blue-600 hover:underline font-medium flex items-center dark:text-blue-400"
                >
                  <Plus size={16} className="mr-1" /> {t("添加配置", "Add Config")}
                </button>
              </div>

              {activeProvider.configs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-500 dark:text-gray-400">{t("暂无配置。", "No configurations yet.")}</p>
                  <button
                    onClick={handleAddConfig}
                    className="mt-2 text-blue-600 font-medium hover:underline dark:text-blue-400"
                  >
                    {t(`添加第一个 ${activeProvider.name} 配置`, `Add your first ${activeProvider.name} config`)}
                  </button>
                </div>
              ) : (
                activeProvider.configs.map((cfg) => (
                  <div
                    key={cfg.id}
                    onClick={() => handleActivateConfig(activeProvider.id, cfg.id)}
                    className={`group bg-white dark:bg-gray-800 rounded-xl p-4 border transition-all duration-200 flex items-center justify-between cursor-pointer ${activeProvider.active_config_id === cfg.id
                      ? "border-blue-500 ring-1 ring-blue-500 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm"
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${activeProvider.active_config_id === cfg.id ? "border-blue-600 bg-blue-600" : "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"
                          }`}
                      >
                        {activeProvider.active_config_id === cfg.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">{cfg.name}</h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 flex flex-col space-y-0.5">
                          <span>URL: {cfg.base_url}</span>
                          <span>Model: {cfg.model || t("默认", "Default")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); handleEditConfig(cfg); }}
                        title={t("编辑", "Edit")}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); handleDeleteConfig(activeProvider.id, cfg.id); }}
                        title={t("删除", "Delete")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Plus size={32} />
            </div>
            <p className="text-lg">{t("添加供应商以开始", "Add a provider to get started")}</p>
          </div>
        )}
      </div>

      <AddProviderModal
        isOpen={isAddProviderModalOpen}
        onClose={() => setIsAddProviderModalOpen(false)}
        onSuccess={(newConfig) => {
          setConfig(newConfig);
          if (newConfig.providers.length > 0) {
            const newest = newConfig.providers[newConfig.providers.length - 1];
            setActiveProviderId(newest.id);
          }
        }}
      />

      {activeProviderId && (
        <AddConfigModal
          isOpen={isAddConfigModalOpen}
          onClose={() => setIsAddConfigModalOpen(false)}
          onSuccess={(newConfig) => setConfig(newConfig)}
          providerId={activeProviderId}
          initialConfig={editingConfig}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />
    </div>
  );
}

export default App;

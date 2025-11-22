import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Eye, EyeOff } from "lucide-react";
import { AppConfig, Config } from "../types";

interface AddConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (config: AppConfig) => void;
  providerId: string;
  initialConfig?: Config | null;
}

export function AddConfigModal({ isOpen, onClose, onSuccess, providerId, initialConfig }: AddConfigModalProps) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setName(initialConfig.name);
        setApiKey(initialConfig.api_key);
        setBaseUrl(initialConfig.base_url);
        setModel(initialConfig.model || "");
      } else {
        setName("");
        setApiKey("");
        setBaseUrl("");
        setModel("");
      }
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const configItem = {
        name,
        api_key: apiKey,
        base_url: baseUrl,
        model: model || undefined,
      };

      let newConfig: AppConfig;

      if (initialConfig) {
        // Update existing config
        const configToSend = { ...configItem, id: initialConfig.id };
        newConfig = await invoke<AppConfig>("update_config", {
          providerId,
          configItem: configToSend
        });
      } else {
        // Add new config
        // Backend ignores ID for new configs
        const configToSend = { ...configItem, id: "" };
        newConfig = await invoke<AppConfig>("add_config", {
          providerId,
          configItem: configToSend
        });
      }

      onSuccess(newConfig);
      onClose();
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("保存配置失败: " + error);
    } finally {
      setIsLoading(false);
    }
  }

  const isEdit = !!initialConfig;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {isEdit ? "编辑配置" : "添加配置"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">配置名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：包月套餐"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm dark:bg-gray-700 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                title={showApiKey ? "隐藏" : "显示"}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型 (可选)</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如：claude-3-5-sonnet-20240620"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isLoading ? "保存中..." : (isEdit ? "保存修改" : "添加配置")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

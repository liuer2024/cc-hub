import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  currentLanguage: 'zh' | 'en';
  onLanguageChange: (lang: 'zh' | 'en') => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  currentLanguage,
  onLanguageChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const t = (zh: string, en: string) => currentLanguage === 'zh' ? zh : en;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-[500px] p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('设置', 'Settings')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Language */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {t('语言', 'Language')}
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => onLanguageChange('zh')}
                className={`flex-1 py-2 px-4 rounded-md border transition-colors ${currentLanguage === 'zh'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                  }`}
              >
                中文
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`flex-1 py-2 px-4 rounded-md border transition-colors ${currentLanguage === 'en'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                  }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {t('主题', 'Theme')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {['light', 'dark', 'blue', 'purple'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => onThemeChange(theme)}
                  className={`py-2 px-4 rounded-md border capitalize transition-colors ${currentTheme === theme
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                    }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

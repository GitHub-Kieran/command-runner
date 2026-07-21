import { watch } from 'vue';
import { useAppStore, type ThemeMode } from '../stores/app';

const STORAGE_KEY = 'theme';

/** Wires the store's theme to <html data-theme> and localStorage; call once from App.vue. */
export function useTheme() {
  const store = useAppStore();

  const saved = localStorage.getItem(STORAGE_KEY);
  store.setTheme(saved === 'light' || saved === 'dark' ? saved : 'dark');

  const applyTheme = (mode: ThemeMode) => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  };

  applyTheme(store.theme);
  watch(() => store.theme, applyTheme);

  const toggleTheme = () => {
    store.setTheme(store.theme === 'light' ? 'dark' : 'light');
  };

  return { toggleTheme };
}

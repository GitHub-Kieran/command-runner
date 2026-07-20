import { onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcutHandlers {
  onExecute: () => void;
  onClearOutput: () => void;
  onToggleFocusMode: () => void;
  onBrowseDirectory: () => void;
  onOpenSettings: () => void;
  /** Whether a command can currently be executed (mirrors the Run button's disabled state). */
  canExecute: () => boolean;
}

/**
 * Desktop-style shortcuts: Ctrl/Cmd+Enter run, Ctrl/Cmd+L clear, F11 focus mode,
 * Ctrl/Cmd+B browse directory, Ctrl/Cmd+, settings. Ignored while typing in a form field.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key === 'Enter') {
      event.preventDefault();
      if (handlers.canExecute()) handlers.onExecute();
      return;
    }

    if (modifier && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      handlers.onClearOutput();
      return;
    }

    if (event.key === 'F11') {
      event.preventDefault();
      handlers.onToggleFocusMode();
      return;
    }

    if (modifier && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      handlers.onBrowseDirectory();
      return;
    }

    if (modifier && event.key === ',') {
      event.preventDefault();
      handlers.onOpenSettings();
    }
  };

  onMounted(() => document.addEventListener('keydown', handleKeyDown));
  onUnmounted(() => document.removeEventListener('keydown', handleKeyDown));
}

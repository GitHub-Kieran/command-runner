<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  themeMode: 'light' | 'dark';
}>();

const emit = defineEmits<{
  toggleFocusMode: [];
  toggleTheme: [];
  settingsClick: [];
}>();
</script>

<template>
  <div class="header-buttons">
    <button
      type="button"
      class="header-buttons__button"
      aria-label="Toggle focus mode"
      title="Focus Mode (F11)"
      @click="emit('toggleFocusMode')"
    >
      <AppIcon name="focus" />
    </button>
    <button
      type="button"
      class="header-buttons__button"
      :aria-label="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      :aria-pressed="themeMode === 'dark'"
      :title="themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      @click="emit('toggleTheme')"
    >
      <AppIcon :name="themeMode === 'dark' ? 'sun' : 'moon'" />
    </button>
    <button
      type="button"
      class="header-buttons__button"
      aria-label="Open settings"
      title="Settings (Ctrl+,)"
      @click="emit('settingsClick')"
    >
      <AppIcon name="settings" />
    </button>
  </div>
</template>

<style scoped>
.header-buttons {
  display: flex;
  gap: var(--space-1);
}

.header-buttons__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.header-buttons__button:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text);
}
</style>

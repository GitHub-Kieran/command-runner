<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <label class="toggle-switch">
    <input
      type="checkbox"
      role="switch"
      class="toggle-switch__input"
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="toggle-switch__track" aria-hidden="true">
      <span class="toggle-switch__thumb"></span>
    </span>
    <span class="toggle-switch__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.toggle-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.toggle-switch__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.toggle-switch__track {
  position: relative;
  width: 2.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background-color: var(--color-border-strong);
  transition: background-color var(--transition-fast);
  flex-shrink: 0;
}

.toggle-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: #ffffff;
  transition: transform var(--transition-fast);
}

.toggle-switch__input:checked + .toggle-switch__track {
  background-color: var(--color-primary);
}

.toggle-switch__input:checked + .toggle-switch__track .toggle-switch__thumb {
  transform: translateX(1rem);
}

.toggle-switch__input:focus-visible + .toggle-switch__track {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.toggle-switch__label {
  font-size: 0.875rem;
}
</style>

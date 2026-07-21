<script setup lang="ts">
import { reactive } from 'vue';
import ToggleSwitch from './ToggleSwitch.vue';
import type { CommandDto } from '../services/api';

const props = defineProps<{
  initial: Partial<CommandDto>;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  save: [command: Partial<CommandDto>];
  cancel: [];
}>();

const form = reactive({
  name: props.initial.name ?? '',
  executable: props.initial.executable ?? '',
  arguments: props.initial.arguments ?? '',
  workingDirectory: props.initial.workingDirectory ?? '',
  shell: props.initial.shell ?? 'bash',
  iterationEnabled: props.initial.iterationEnabled ?? false,
  requireConfirmation: props.initial.requireConfirmation ?? false,
});

function handleSubmit() {
  if (!form.name.trim() || !form.executable.trim()) {
    alert('Please fill in Name and Executable');
    return;
  }

  emit('save', {
    name: form.name,
    executable: form.executable,
    arguments: form.arguments,
    workingDirectory: form.workingDirectory || '~/',
    shell: form.shell,
    iterationEnabled: form.iterationEnabled,
    requireConfirmation: form.requireConfirmation,
    environmentVariables: props.initial.environmentVariables ?? {},
  });
}
</script>

<template>
  <form class="entity-form" @submit.prevent="handleSubmit">
    <h3 class="entity-form__title">{{ isEditing ? 'Edit Command' : 'Add New Command' }}</h3>

    <div class="field">
      <label class="field__label" for="command-form-name">Command Name</label>
      <input id="command-form-name" v-model="form.name" class="field__control" type="text" required autofocus />
    </div>

    <div class="field">
      <label class="field__label" for="command-form-executable">Executable</label>
      <input
        id="command-form-executable"
        v-model="form.executable"
        class="field__control"
        type="text"
        placeholder="e.g., git, npm, python"
        required
      />
    </div>

    <div class="field">
      <label class="field__label" for="command-form-arguments">Arguments</label>
      <input
        id="command-form-arguments"
        v-model="form.arguments"
        class="field__control"
        type="text"
        placeholder="e.g., --version, pull --rebase"
      />
    </div>

    <div class="field">
      <label class="field__label" for="command-form-cwd">Working Directory</label>
      <input
        id="command-form-cwd"
        v-model="form.workingDirectory"
        class="field__control"
        type="text"
        placeholder="e.g., ~/projects, /usr/local/bin"
      />
    </div>

    <div class="field">
      <label class="field__label" for="command-form-shell">Shell</label>
      <select id="command-form-shell" v-model="form.shell" class="field__control">
        <option value="bash">bash</option>
        <option value="powershell">PowerShell</option>
        <option value="cmd">Command Prompt</option>
      </select>
    </div>

    <div class="entity-form__toggles">
      <ToggleSwitch v-model="form.iterationEnabled" label="Run in subdirectories" />
      <ToggleSwitch v-model="form.requireConfirmation" label="Require confirmation" />
    </div>

    <div class="entity-form__actions">
      <button type="button" class="btn btn--outline" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="btn btn--primary">{{ isEditing ? 'Update' : 'Create' }} Command</button>
    </div>
  </form>
</template>

<style scoped>
.entity-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 480px;
}

.entity-form__title {
  font-size: 1.05rem;
}

.entity-form__toggles {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.entity-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>

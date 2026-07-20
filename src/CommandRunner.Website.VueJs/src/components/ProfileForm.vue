<script setup lang="ts">
import { reactive } from 'vue';

const props = defineProps<{
  initialName: string;
  initialDescription: string;
  isEditing: boolean;
  submitting: boolean;
}>();

const emit = defineEmits<{
  save: [name: string, description: string];
  cancel: [];
}>();

const form = reactive({
  name: props.initialName,
  description: props.initialDescription,
});

function handleSubmit() {
  if (!form.name.trim()) {
    alert('Please enter a profile name');
    return;
  }
  emit('save', form.name.trim(), form.description.trim());
}
</script>

<template>
  <form class="entity-form" @submit.prevent="handleSubmit">
    <h3 class="entity-form__title">{{ isEditing ? 'Edit Profile' : 'Add New Profile' }}</h3>

    <div class="field">
      <label class="field__label" for="profile-form-name">Profile Name</label>
      <input
        id="profile-form-name"
        v-model="form.name"
        class="field__control"
        type="text"
        required
        autofocus
      />
    </div>

    <div class="field">
      <label class="field__label" for="profile-form-description">Description (optional)</label>
      <textarea id="profile-form-description" v-model="form.description" class="field__control" rows="2"></textarea>
    </div>

    <div class="entity-form__actions">
      <button type="button" class="btn btn--outline" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? 'Creating...' : isEditing ? 'Update Profile' : 'Create Profile' }}
      </button>
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

.entity-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>

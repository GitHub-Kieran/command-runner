<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import ProfileCard from './ProfileCard.vue';
import CommandCard from './CommandCard.vue';
import ProfileForm from './ProfileForm.vue';
import CommandForm from './CommandForm.vue';
import { useAppStore } from '../stores/app';
import { profilesApi } from '../services/api';
import type { CommandDto, ProfileDto } from '../services/api';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useAppStore();
const dialogRef = ref<HTMLDialogElement | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);

type View = 'list' | 'profile-form' | 'command-form';
const view = ref<View>('list');
const editingProfile = ref<ProfileDto | null>(null);
const editingCommand = ref<CommandDto | null>(null);

function resetDialogState() {
  view.value = 'list';
  editingProfile.value = null;
  editingCommand.value = null;
}

watch(
  () => props.open,
  (isOpen) => {
    const dialog = dialogRef.value;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      resetDialogState();
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  },
);

// Fires on Esc, backdrop click (via @cancel), or the explicit close button.
function handleNativeClose() {
  emit('close');
}

function handleSelectProfile(profile: ProfileDto) {
  store.setSelectedProfile(profile);
  resetDialogState();
}

function handleAddProfile() {
  editingProfile.value = null;
  view.value = 'profile-form';
}

function handleEditProfileDetails(profile: ProfileDto) {
  editingProfile.value = profile;
  view.value = 'profile-form';
}

async function handleSaveProfile(name: string, description: string) {
  const profileData: ProfileDto = {
    id: editingProfile.value?.id ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name,
    description,
    commands: editingProfile.value?.commands ?? [],
    createdAt: editingProfile.value?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: editingProfile.value?.isFavorite ?? false,
  };

  const wasEditing = Boolean(editingProfile.value);
  view.value = 'list';
  editingProfile.value = null;

  if (wasEditing) {
    store.updateProfile(profileData);
  } else {
    await store.addProfile(profileData);
  }
}

function handleDeleteProfile(profile: ProfileDto) {
  if (confirm(`Delete profile "${profile.name}" and all its commands?`)) {
    store.deleteProfile(profile.id);
  }
}

function moveProfile(profileId: string, direction: -1 | 1) {
  const index = store.profiles.findIndex((p) => p.id === profileId);
  const newIndex = index + direction;
  if (index === -1 || newIndex < 0 || newIndex >= store.profiles.length) return;

  const reordered = [...store.profiles];
  const [item] = reordered.splice(index, 1);
  reordered.splice(newIndex, 0, item);
  store.setProfiles(reordered);
}

async function handleImportProfile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const imported = await profilesApi.importProfile(file);
    store.setProfiles([...store.profiles, imported]);
    store.setSelectedProfile(imported);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to import profile');
  } finally {
    input.value = '';
  }
}

const defaultCommandForm: Partial<CommandDto> = {
  name: '',
  executable: '',
  arguments: '',
  workingDirectory: '~/',
  shell: 'bash',
  environmentVariables: {},
  iterationEnabled: false,
  requireConfirmation: false,
};

function handleAddCommand() {
  editingCommand.value = null;
  view.value = 'command-form';
}

function handleEditCommand(command: CommandDto) {
  editingCommand.value = command;
  view.value = 'command-form';
}

function handleSaveCommand(partial: Partial<CommandDto>) {
  const profile = store.selectedProfile;
  if (!profile) return;

  const commandData: CommandDto = {
    id: editingCommand.value?.id ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name: partial.name ?? '',
    executable: partial.executable ?? '',
    arguments: partial.arguments ?? '',
    workingDirectory: partial.workingDirectory ?? '~/',
    shell: partial.shell ?? 'bash',
    environmentVariables: partial.environmentVariables ?? {},
    iterationEnabled: partial.iterationEnabled ?? false,
    requireConfirmation: partial.requireConfirmation ?? false,
    createdAt: editingCommand.value?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const commands = editingCommand.value
    ? profile.commands.map((c) => (c.id === editingCommand.value?.id ? commandData : c))
    : [...profile.commands, commandData];

  store.updateProfile({ ...profile, commands });
  view.value = 'list';
  editingCommand.value = null;
}

function handleDeleteCommand(command: CommandDto) {
  const profile = store.selectedProfile;
  if (!profile) return;

  if (confirm(`Delete command "${command.name}"?`)) {
    store.updateProfile({ ...profile, commands: profile.commands.filter((c) => c.id !== command.id) });
  }
}

function moveCommand(commandId: string, direction: -1 | 1) {
  const profile = store.selectedProfile;
  if (!profile) return;

  const index = profile.commands.findIndex((c) => c.id === commandId);
  const newIndex = index + direction;
  if (index === -1 || newIndex < 0 || newIndex >= profile.commands.length) return;

  const reordered = [...profile.commands];
  const [item] = reordered.splice(index, 1);
  reordered.splice(newIndex, 0, item);
  store.updateProfile({ ...profile, commands: reordered, updatedAt: new Date().toISOString() });
}

const commandFormInitial = computed<Partial<CommandDto>>(() => {
  if (editingCommand.value) return { ...editingCommand.value };
  return {
    ...defaultCommandForm,
    workingDirectory: store.selectedProfile?.commands[0]?.workingDirectory || '~/',
  };
});
</script>

<template>
  <dialog
    ref="dialogRef"
    class="settings-dialog"
    aria-labelledby="settings-dialog-heading"
    @close="handleNativeClose"
    @cancel="handleNativeClose"
  >
    <div class="settings-dialog__header">
      <h2 id="settings-dialog-heading" class="settings-dialog__heading">
        <AppIcon name="settings" /> Manage Profiles &amp; Commands
      </h2>
      <button type="button" class="btn btn--icon" aria-label="Close settings dialog" @click="dialogRef?.close()">
        <AppIcon name="clear" />
      </button>
    </div>

    <div class="settings-dialog__body">
      <template v-if="view === 'list'">
        <section>
          <div class="settings-dialog__section-header">
            <h3>Profiles</h3>
            <div class="settings-dialog__section-actions">
              <button type="button" class="btn btn--sm btn--outline" @click="importInputRef?.click()">
                <AppIcon name="upload" /> Import Profile
              </button>
              <button type="button" class="btn btn--icon btn--primary" aria-label="Add profile" @click="handleAddProfile">
                <AppIcon name="plus" />
              </button>
            </div>
          </div>

          <div class="settings-dialog__cards">
            <ProfileCard
              v-for="(profile, index) in store.profiles"
              :key="profile.id"
              :profile="profile"
              :is-selected="store.selectedProfile?.id === profile.id"
              :can-move-up="index > 0"
              :can-move-down="index < store.profiles.length - 1"
              @select="handleSelectProfile(profile)"
              @edit-details="handleEditProfileDetails(profile)"
              @delete="handleDeleteProfile(profile)"
              @move-up="moveProfile(profile.id, -1)"
              @move-down="moveProfile(profile.id, 1)"
            />
          </div>
        </section>

        <template v-if="store.selectedProfile">
          <hr class="settings-dialog__divider" />
          <section>
            <div class="settings-dialog__section-header">
              <h3>Commands in "{{ store.selectedProfile.name }}" ({{ store.selectedProfile.commands.length }})</h3>
              <button type="button" class="btn btn--icon btn--primary" aria-label="Add command" @click="handleAddCommand">
                <AppIcon name="plus" />
              </button>
            </div>

            <p v-if="store.selectedProfile.commands.length === 0" class="settings-dialog__empty">
              No commands in this profile yet.
              <button type="button" class="btn btn--outline" @click="handleAddCommand">
                <AppIcon name="plus" /> Add First Command
              </button>
            </p>

            <div v-else class="settings-dialog__cards">
              <CommandCard
                v-for="(command, index) in store.selectedProfile.commands"
                :key="command.id"
                :command="command"
                :can-move-up="index > 0"
                :can-move-down="index < store.selectedProfile.commands.length - 1"
                @edit="handleEditCommand(command)"
                @delete="handleDeleteCommand(command)"
                @move-up="moveCommand(command.id, -1)"
                @move-down="moveCommand(command.id, 1)"
              />
            </div>
          </section>
        </template>
      </template>

      <ProfileForm
        v-else-if="view === 'profile-form'"
        :initial-name="editingProfile?.name ?? ''"
        :initial-description="editingProfile?.description ?? ''"
        :is-editing="Boolean(editingProfile)"
        :submitting="store.creatingProfile"
        @save="handleSaveProfile"
        @cancel="view = 'list'"
      />

      <CommandForm
        v-else
        :initial="commandFormInitial"
        :is-editing="Boolean(editingCommand)"
        @save="handleSaveCommand"
        @cancel="view = 'list'"
      />
    </div>

    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="visually-hidden"
      @change="handleImportProfile"
    />
  </dialog>
</template>

<style scoped>
.settings-dialog {
  width: min(960px, 92vw);
  max-height: 85vh;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}

.settings-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.settings-dialog__heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1.125rem;
}

.settings-dialog__body {
  padding: var(--space-4);
  overflow-y: auto;
  max-height: calc(85vh - 4.5rem);
}

.settings-dialog__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  gap: var(--space-2);
}

.settings-dialog__section-actions {
  display: flex;
  gap: var(--space-2);
}

.settings-dialog__cards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.settings-dialog__divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-5) 0;
}

.settings-dialog__empty {
  text-align: center;
  padding: var(--space-5) 0;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
</style>

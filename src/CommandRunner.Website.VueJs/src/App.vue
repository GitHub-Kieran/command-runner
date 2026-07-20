<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAppStore } from './stores/app';
import { useTheme } from './composables/useTheme';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import { commandsApi } from './services/api';
import type { CommandDto, CommandExecutionResponse, FavoriteDirectoryDto, IterationExecutionResponse } from './services/api';

import HeaderButtons from './components/HeaderButtons.vue';
import AlertBanner from './components/AlertBanner.vue';
import ProfileSelector from './components/ProfileSelector.vue';
import DirectorySelector from './components/DirectorySelector.vue';
import CommandSelector from './components/CommandSelector.vue';
import CommandControls from './components/CommandControls.vue';
import CommandDetails from './components/CommandDetails.vue';
import CommandPreview from './components/CommandPreview.vue';
import OutputPanel from './components/OutputPanel.vue';
import ToastNotification from './components/ToastNotification.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import AppIcon from './components/AppIcon.vue';

const store = useAppStore();
const { toggleTheme } = useTheme();

const selectedCommand = ref<CommandDto | null>(null);
const isExecuting = ref(false);
const output = ref('');
const settingsOpen = ref(false);
const focusMode = ref(false);
const showSuccessToast = ref(false);
const retryingApi = ref(false);

let abortController: AbortController | null = null;
let lastProgressSnapshot = '';

const availableDirectories = computed<FavoriteDirectoryDto[]>(() => {
  const directories = [...store.directories];
  const workingDirectory = selectedCommand.value?.workingDirectory;

  if (workingDirectory && !directories.some((d) => d.path === workingDirectory)) {
    const pathParts = workingDirectory.split('/').filter(Boolean);
    const name = pathParts.at(-1) ?? workingDirectory;
    directories.push({
      id: `cmd-dir-${selectedCommand.value!.id}`,
      path: workingDirectory,
      name,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    });
  }

  return directories;
});

function toggleFocusMode() {
  focusMode.value = !focusMode.value;
}

function handleBrowseClick() {
  const directoryPath = prompt('Enter directory path:', store.selectedDirectory?.path || '~/');
  if (!directoryPath?.trim()) return;

  const path = directoryPath.trim();
  const pathParts = path.split('/').filter(Boolean);
  const name = pathParts.at(-1) ?? path;

  const existing = store.directories.find((d) => d.path === path);
  if (existing) {
    store.setSelectedDirectory(existing);
    return;
  }

  const newDirectory: FavoriteDirectoryDto = {
    id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    path,
    name,
    createdAt: new Date().toISOString(),
    usageCount: 1,
  };
  store.addDirectory(newDirectory);
  store.setSelectedDirectory(newDirectory);
}

function handleCopyOutput() {
  navigator.clipboard.writeText(output.value);
}

function handleSaveLog() {
  const blob = new Blob([output.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `command-output-${new Date().toISOString().slice(0, 19)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isIterationResult(result: unknown): result is IterationExecutionResponse {
  return typeof (result as IterationExecutionResponse)?.totalItems === 'number';
}

function isCommandResult(result: unknown): result is CommandExecutionResponse {
  return typeof (result as CommandExecutionResponse)?.exitCode === 'number';
}

async function handleExecuteCommand() {
  const command = selectedCommand.value;
  if (!command || !store.selectedProfile) return;

  abortController?.abort();
  abortController = new AbortController();
  lastProgressSnapshot = '';

  if (command.requireConfirmation) {
    const workingDir = store.selectedDirectory?.path || command.workingDirectory || '~/';
    const confirmed = confirm(
      `This command requires confirmation:\n\n${command.name}\n${command.executable} ${command.arguments}\n\nWorking Directory: ${workingDir}\n\nDo you want to proceed?`,
    );
    if (!confirmed) return;
  }

  isExecuting.value = true;
  const workingDirectory = store.selectedDirectory?.path || command.workingDirectory || '~/';
  output.value = command.iterationEnabled
    ? `Executing iteratively: ${command.executable} ${command.arguments}\nWorking Directory: ${workingDirectory}\nScanning subdirectories...\n\n`
    : `Executing: ${command.executable} ${command.arguments}\nWorking Directory: ${workingDirectory}\n\n`;

  try {
    const request = {
      commandId: command.id,
      profileId: store.selectedProfile.id,
      workingDirectory,
      userConfirmed: command.requireConfirmation,
    };

    let result: CommandExecutionResponse | IterationExecutionResponse;

    if (command.iterationEnabled) {
      result = await commandsApi.executeIterativeCommandWithStreaming(
        {
          ...request,
          iterationOptions: {
            maxDepth: 1,
            includeRootDirectory: false,
            skipErrors: true,
            stopOnFirstFailure: false,
            excludePatterns: [],
            includePatterns: [],
            maxParallelism: 1,
          },
        },
        {
          onItemStart: (itemPath) => {
            const dirName = itemPath.split(/[\\/]/).filter(Boolean).pop() || itemPath;
            output.value += `\n▶ Processing ${dirName}\n`;
          },
          onStdout: (itemPath, line) => {
            const dirName = itemPath.split(/[\\/]/).filter(Boolean).pop() || itemPath;
            output.value += `[${dirName}] ${line}\n`;
          },
          onStderr: (itemPath, line) => {
            const dirName = itemPath.split(/[\\/]/).filter(Boolean).pop() || itemPath;
            output.value += `[${dirName}][stderr] ${line}\n`;
          },
          onProgress: (progress) => {
            const snapshot = `${progress.processedItems}/${progress.totalItems}:${progress.successfulItems}:${progress.failedItems}:${progress.skippedItems}`;
            if (lastProgressSnapshot === snapshot) return;
            lastProgressSnapshot = snapshot;
            output.value += `[progress] ${progress.processedItems}/${progress.totalItems} (ok: ${progress.successfulItems}, failed: ${progress.failedItems}, skipped: ${progress.skippedItems})\n`;
          },
          onError: (message) => {
            output.value += `[error] ${message}\n`;
          },
        },
        abortController.signal,
      );
    } else {
      result = await commandsApi.executeCommandWithStreaming(
        request,
        {
          onStdout: (line) => {
            output.value += `${line}\n`;
          },
          onStderr: (line) => {
            output.value += `[stderr] ${line}\n`;
          },
          onError: (message) => {
            output.value += `[error] ${message}\n`;
          },
        },
        abortController.signal,
      );
    }

    let summary = '';

    if (command.iterationEnabled && isIterationResult(result)) {
      summary = 'Iterative execution completed\n';
      summary += `Total Items: ${result.totalItems}\n`;
      summary += `Successful: ${result.successfulItems}\n`;
      summary += `Failed: ${result.failedItems}\n`;
      summary += `Skipped: ${result.skippedItems}\n`;
      summary += `Execution Time: ${result.startedAt} - ${result.completedAt || 'In Progress'}\n\n`;

      if (result.itemResults.length > 0) {
        summary += 'Results by directory:\n\n';
        for (const item of result.itemResults) {
          const status = item.wasSuccessful ? '✅' : '❌';
          const dirName = item.itemPath.split('/').pop() || item.itemPath;
          summary += `${status} ${dirName}/\n`;
          if (item.output?.trim()) summary += `   Output: ${item.output.trim()}\n`;
          if (item.errorOutput?.trim()) summary += `   Error: ${item.errorOutput.trim()}\n`;
          if (item.executionTime) summary += `   Execution time: ${item.executionTime}\n`;
          if (!item.wasSuccessful && item.errorMessage) {
            summary += `   Error: ${item.errorMessage}\n`;
          } else if (item.wasSuccessful && !item.output?.trim() && !item.errorOutput?.trim()) {
            summary += '   Status: Command completed successfully\n';
          }
          summary += '\n';
        }
      }

      if (result.wasCancelled) summary += '⚠️  Execution was cancelled\n';
    } else if (!command.iterationEnabled && isCommandResult(result)) {
      summary = '\nCommand completed\n';
      summary += `Exit Code: ${result.exitCode}\n`;
      summary += `Execution Time: ${result.executionTime}\n\n`;

      if (result.exitCode === 0) {
        summary += '✅ Success: Command executed successfully\n\n';
      } else if (result.exitCode === 128 && result.errorOutput?.includes('not a git repository')) {
        summary += 'ℹ️  Info: Directory is not a git repository\n';
        summary += "💡 Tip: Use 'git init' to initialize or navigate to a git repository\n\n";
      } else {
        summary += `⚠️  Warning: Command exited with code ${result.exitCode}\n\n`;
      }

      if (!result.output?.trim() && result.exitCode === 0) {
        summary += 'Output: (command completed successfully, no output)\n';
      }
      if (result.errorOutput?.trim()) summary += `\nErrors:\n${result.errorOutput}\n`;
      if (result.executionErrors?.length) summary += `\nExecution Errors:\n${result.executionErrors.join('\n')}\n`;
    }

    if (!command.iterationEnabled) {
      output.value += summary;
    } else if (summary) {
      output.value += `\n${summary}`;
    }

    if (!command.iterationEnabled && isCommandResult(result) && result.exitCode === 0) {
      showSuccessToast.value = true;
    } else if (command.iterationEnabled && isIterationResult(result) && result.failedItems === 0) {
      showSuccessToast.value = true;
    }

    if (!command.iterationEnabled && isCommandResult(result)) {
      store.addExecution(result);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      output.value += '\n[info] Execution stopped by user.\n';
      return;
    }

    const message = (error as Error)?.message || String(error) || 'Unknown error occurred';
    output.value = `Command execution failed:\n${message}\n\nTroubleshooting tips:\n• Check if the working directory exists\n• Verify the command is available in PATH\n• Ensure proper permissions\n• Try using absolute paths instead of ~\n`;
  } finally {
    isExecuting.value = false;
    abortController = null;
    lastProgressSnapshot = '';
  }
}

function handleStopExecution() {
  abortController?.abort();
}

function handleCommandChange(commandId: string) {
  if (!store.selectedProfile) return;
  const command = store.selectedProfile.commands.find((c) => c.id === commandId) ?? null;
  selectedCommand.value = command;
  showSuccessToast.value = false;

  if (command?.workingDirectory && !store.selectedDirectory) {
    const match = availableDirectories.value.find((d) => d.path === command.workingDirectory);
    if (match) store.setSelectedDirectory(match);
  }
}

function handleClearCommand() {
  selectedCommand.value = null;
}

function handleClearOutput() {
  output.value = '';
  showSuccessToast.value = false;
}

async function handleRetryApiConnection() {
  retryingApi.value = true;
  store.setError(null);
  await store.loadInitialData();
  retryingApi.value = false;
}

onMounted(() => {
  store.loadInitialData();
});

// Auto-select the first profile & its first command once profiles load.
watch(
  () => store.profiles,
  (profiles) => {
    if (profiles.length > 0 && !store.selectedProfile) {
      store.setSelectedProfile(profiles[0]);
      selectedCommand.value = profiles[0].commands[0] ?? null;
    }
  },
);

// Auto-select the command's working directory when it becomes available.
watch([selectedCommand, () => store.directories], () => {
  const workingDirectory = selectedCommand.value?.workingDirectory;
  if (!workingDirectory) return;
  const match = availableDirectories.value.find((d) => d.path === workingDirectory);
  if (match) store.setSelectedDirectory(match);
});

useKeyboardShortcuts({
  onExecute: handleExecuteCommand,
  onClearOutput: handleClearOutput,
  onToggleFocusMode: toggleFocusMode,
  onBrowseDirectory: handleBrowseClick,
  onOpenSettings: () => {
    settingsOpen.value = true;
  },
  canExecute: () => Boolean(selectedCommand.value) && !isExecuting.value,
});
</script>

<template>
  <div class="app" :class="{ 'app--focus': focusMode }">
    <header v-if="!focusMode" class="app__header">
      <h1 class="app__title">Command Runner</h1>
      <HeaderButtons :theme-mode="store.theme" @toggle-focus-mode="toggleFocusMode" @toggle-theme="toggleTheme" @settings-click="settingsOpen = true" />
    </header>

    <main class="app__main">
      <AlertBanner v-if="store.error" :message="store.error" :retrying="retryingApi" @retry="handleRetryApiConnection" />

      <section class="panel" :class="{ 'panel--compact': focusMode }">
        <div class="app__row">
          <ProfileSelector
            :profiles="store.profiles"
            :selected-profile="store.selectedProfile"
            @change="
              (profile) => {
                store.setSelectedProfile(profile);
                selectedCommand = profile?.commands[0] ?? null;
              }
            "
          />

          <DirectorySelector
            v-if="!focusMode"
            :directories="availableDirectories"
            :selected-directory="store.selectedDirectory"
            @change="store.setSelectedDirectory"
          />

          <div v-if="focusMode" class="app__row-header-buttons">
            <HeaderButtons :theme-mode="store.theme" @toggle-focus-mode="toggleFocusMode" @toggle-theme="toggleTheme" @settings-click="settingsOpen = true" />
          </div>
          <button v-else type="button" class="btn btn--outline" @click="handleBrowseClick">
            <AppIcon name="folder" /> Select Directory
          </button>
        </div>
      </section>

      <section class="panel" :class="{ 'panel--compact': focusMode }">
        <div class="app__row">
          <CommandSelector :selected-profile="store.selectedProfile" :selected-command="selectedCommand" @change="handleCommandChange" />
          <CommandControls
            :selected-command="selectedCommand"
            :is-executing="isExecuting"
            @execute="handleExecuteCommand"
            @stop="handleStopExecution"
            @clear="handleClearCommand"
          />
        </div>
      </section>

      <CommandDetails v-if="!focusMode && selectedCommand" :selected-command="selectedCommand" :selected-directory="store.selectedDirectory" />

      <CommandPreview v-if="selectedCommand" :selected-command="selectedCommand" :selected-directory="store.selectedDirectory" :focus-mode="focusMode" />

      <OutputPanel
        :output="output"
        :is-loading="isExecuting || store.isLoading"
        :focus-mode="focusMode"
        @clear="handleClearOutput"
        @copy="handleCopyOutput"
        @save="handleSaveLog"
      />
    </main>

    <ToastNotification :open="showSuccessToast" message="Command completed successfully!" @close="showSuccessToast = false" />

    <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.app__title {
  font-size: 1.125rem;
}

.app__main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.app--focus .app__main {
  gap: var(--space-2);
}

.app__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.app__row-header-buttons {
  display: flex;
  justify-content: center;
  flex: 1;
}
</style>

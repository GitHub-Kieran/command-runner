import { apiClient, API_BASE_URL } from './client';
import type {
  CommandExecutionRequest,
  CommandExecutionResponse,
  IterationExecutionResponse,
  ValidationResult,
} from './types';

export interface StreamingHandlers {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onError?: (message: string) => void;
}

export interface IterationProgressEvent {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  currentItem: string;
  currentDirectory: string;
  isCompleted: boolean;
  wasCancelled: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface IterationItemCompleteEvent {
  itemPath: string;
  wasSuccessful: boolean;
  errorMessage?: string;
  output: string;
  errorOutput: string;
  executionTime?: string;
  executedAt: string;
}

export interface IterativeStreamingHandlers {
  onItemStart?: (itemPath: string, itemName: string) => void;
  onStdout?: (itemPath: string, line: string) => void;
  onStderr?: (itemPath: string, line: string) => void;
  onProgress?: (progress: IterationProgressEvent) => void;
  onItemComplete?: (item: IterationItemCompleteEvent) => void;
  onError?: (message: string) => void;
}

/** Splits a raw SSE frame ("event: x\ndata: y\n\n") into its event name and data payload. */
function parseSseFrame(rawEvent: string): { eventName: string; data: string } {
  const lines = rawEvent.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  return { eventName, data: dataLines.join('\n') };
}

async function* readSseFrames(response: Response): AsyncGenerator<{ eventName: string; data: string }> {
  if (!response.body) {
    throw new Error('Response has no body to stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const rawFrame of frames) {
      if (rawFrame.trim()) {
        yield parseSseFrame(rawFrame);
      }
    }
  }
}

function parseProgressPayload(data: string): IterationProgressEvent {
  const parsed = JSON.parse(data) as Record<string, unknown>;
  return {
    totalItems: Number(parsed.totalItems ?? parsed.TotalItems ?? 0),
    processedItems: Number(parsed.processedItems ?? parsed.ProcessedItems ?? 0),
    successfulItems: Number(parsed.successfulItems ?? parsed.SuccessfulItems ?? 0),
    failedItems: Number(parsed.failedItems ?? parsed.FailedItems ?? 0),
    skippedItems: Number(parsed.skippedItems ?? parsed.SkippedItems ?? 0),
    currentItem: String(parsed.currentItem ?? parsed.CurrentItem ?? ''),
    currentDirectory: String(parsed.currentDirectory ?? parsed.CurrentDirectory ?? ''),
    isCompleted: Boolean(parsed.isCompleted ?? parsed.IsCompleted ?? false),
    wasCancelled: Boolean(parsed.wasCancelled ?? parsed.WasCancelled ?? false),
    startedAt: String(parsed.startedAt ?? parsed.StartedAt ?? ''),
    completedAt:
      parsed.completedAt ?? parsed.CompletedAt ? String(parsed.completedAt ?? parsed.CompletedAt) : undefined,
  };
}

export const commandsApi = {
  executeCommand(request: CommandExecutionRequest): Promise<CommandExecutionResponse> {
    return apiClient.post<CommandExecutionResponse>('/api/commands/execute', request);
  },

  executeIterativeCommand(request: CommandExecutionRequest): Promise<IterationExecutionResponse> {
    return apiClient.post<IterationExecutionResponse>('/api/commands/execute-iterative', request);
  },

  validateCommand(profileId: string, commandId: string): Promise<ValidationResult> {
    return apiClient.post<ValidationResult>(`/api/commands/validate/${profileId}/${commandId}`);
  },

  async executeCommandWithStreaming(
    request: CommandExecutionRequest,
    handlers?: StreamingHandlers,
    signal?: AbortSignal,
  ): Promise<CommandExecutionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/commands/execute-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to start streaming command execution (${response.status})`);
    }

    let completedResponse: CommandExecutionResponse | null = null;

    for await (const { eventName, data } of readSseFrames(response)) {
      switch (eventName) {
        case 'stdout':
          handlers?.onStdout?.(data.replace(/\\n/g, '\n'));
          break;
        case 'stderr':
          handlers?.onStderr?.(data.replace(/\\n/g, '\n'));
          break;
        case 'error':
        case 'cancelled':
          handlers?.onError?.(data.replace(/\\n/g, '\n'));
          break;
        case 'complete':
          completedResponse = JSON.parse(data) as CommandExecutionResponse;
          break;
      }
    }

    if (!completedResponse) {
      throw new Error('Streaming execution completed without a final response payload');
    }

    return completedResponse;
  },

  async executeIterativeCommandWithStreaming(
    request: CommandExecutionRequest,
    handlers?: IterativeStreamingHandlers,
    signal?: AbortSignal,
  ): Promise<IterationExecutionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/commands/execute-iterative-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(request),
      signal,
    });

    if (response.status === 404) {
      handlers?.onError?.('Iterative streaming endpoint not found. Falling back to non-streaming iterative execution.');
      return commandsApi.executeIterativeCommand(request);
    }

    if (!response.ok || !response.body) {
      throw new Error(`Failed to start iterative streaming execution (${response.status})`);
    }

    let completedResponse: IterationExecutionResponse | null = null;

    for await (const { eventName, data } of readSseFrames(response)) {
      switch (eventName) {
        case 'item-start': {
          const parsed = JSON.parse(data) as { itemPath: string; itemName: string };
          handlers?.onItemStart?.(parsed.itemPath, parsed.itemName);
          break;
        }
        case 'stdout': {
          const parsed = JSON.parse(data) as { itemPath: string; line: string };
          handlers?.onStdout?.(parsed.itemPath, parsed.line);
          break;
        }
        case 'stderr': {
          const parsed = JSON.parse(data) as { itemPath: string; line: string };
          handlers?.onStderr?.(parsed.itemPath, parsed.line);
          break;
        }
        case 'progress':
          handlers?.onProgress?.(parseProgressPayload(data));
          break;
        case 'item-complete':
          handlers?.onItemComplete?.(JSON.parse(data) as IterationItemCompleteEvent);
          break;
        case 'error':
        case 'cancelled':
          handlers?.onError?.(data.replace(/\\n/g, '\n'));
          break;
        case 'complete':
          completedResponse = JSON.parse(data) as IterationExecutionResponse;
          break;
      }
    }

    if (!completedResponse) {
      throw new Error('Iterative streaming execution completed without a final response payload');
    }

    return completedResponse;
  },
};

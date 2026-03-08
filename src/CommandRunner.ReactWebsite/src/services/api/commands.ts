import { apiClient } from './client';
import {
  CommandExecutionRequest,
  CommandExecutionResponse,
  IterationExecutionResponse,
  ValidationResult
} from './types';

type StreamingHandlers = {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onError?: (message: string) => void;
};

type IterativeStreamingHandlers = {
  onItemStart?: (itemPath: string, itemName: string) => void;
  onStdout?: (itemPath: string, line: string) => void;
  onStderr?: (itemPath: string, line: string) => void;
  onProgress?: (progress: {
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
  }) => void;
  onItemComplete?: (item: {
    itemPath: string;
    wasSuccessful: boolean;
    errorMessage?: string;
    output: string;
    errorOutput: string;
    executionTime?: string;
    executedAt: string;
  }) => void;
  onError?: (message: string) => void;
};

export class CommandsApiService {
  // Execute a single command
  async executeCommand(request: CommandExecutionRequest): Promise<CommandExecutionResponse> {
    return apiClient.post<CommandExecutionResponse>('/api/commands/execute', request);
  }

  // Execute command iteratively (in multiple directories)
  async executeIterativeCommand(request: CommandExecutionRequest): Promise<IterationExecutionResponse> {
    return apiClient.post<IterationExecutionResponse>('/api/commands/execute-iterative', request);
  }

  // Validate command security
  async validateCommand(profileId: string, commandId: string): Promise<ValidationResult> {
    return apiClient.post<ValidationResult>(`/api/commands/validate/${profileId}/${commandId}`);
  }


  // Stream execution output via Server-Sent Events
  async executeCommandWithStreaming(
    request: CommandExecutionRequest,
    handlers?: StreamingHandlers,
    signal?: AbortSignal
  ): Promise<CommandExecutionResponse> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5081';
    const response = await fetch(`${apiBaseUrl}/api/commands/execute-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(request),
      signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to start streaming command execution (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completedResponse: CommandExecutionResponse | null = null;

    const parseEvent = (rawEvent: string) => {
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

      const data = dataLines.join('\n');

      if (eventName === 'stdout') {
        handlers?.onStdout?.(data.replace(/\\n/g, '\n'));
        return;
      }

      if (eventName === 'stderr') {
        handlers?.onStderr?.(data.replace(/\\n/g, '\n'));
        return;
      }

      if (eventName === 'error' || eventName === 'cancelled') {
        handlers?.onError?.(data.replace(/\\n/g, '\n'));
        return;
      }

      if (eventName === 'complete') {
        completedResponse = JSON.parse(data) as CommandExecutionResponse;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        if (rawEvent.trim()) {
          parseEvent(rawEvent);
        }
      }
    }

    if (!completedResponse) {
      throw new Error('Streaming execution completed without a final response payload');
    }

    return completedResponse;
  }

  async executeIterativeCommandWithStreaming(
    request: CommandExecutionRequest,
    handlers?: IterativeStreamingHandlers,
    signal?: AbortSignal
  ): Promise<IterationExecutionResponse> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5081';
    const response = await fetch(`${apiBaseUrl}/api/commands/execute-iterative-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(request),
      signal
    });

    if (response.status === 404) {
      handlers?.onError?.('Iterative streaming endpoint not found. Falling back to non-streaming iterative execution.');
      return this.executeIterativeCommand(request);
    }

    if (!response.ok || !response.body) {
      throw new Error(`Failed to start iterative streaming execution (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completedResponse: IterationExecutionResponse | null = null;

    const parseEvent = (rawEvent: string) => {
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

      const data = dataLines.join('\n');

      if (eventName === 'item-start') {
        const parsed = JSON.parse(data) as { itemPath: string; itemName: string };
        handlers?.onItemStart?.(parsed.itemPath, parsed.itemName);
        return;
      }

      if (eventName === 'stdout') {
        const parsed = JSON.parse(data) as { itemPath: string; line: string };
        handlers?.onStdout?.(parsed.itemPath, parsed.line);
        return;
      }

      if (eventName === 'stderr') {
        const parsed = JSON.parse(data) as { itemPath: string; line: string };
        handlers?.onStderr?.(parsed.itemPath, parsed.line);
        return;
      }

      if (eventName === 'progress') {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        handlers?.onProgress?.({
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
          completedAt: parsed.completedAt ?? parsed.CompletedAt
            ? String(parsed.completedAt ?? parsed.CompletedAt)
            : undefined,
        });
        return;
      }

      if (eventName === 'item-complete') {
        handlers?.onItemComplete?.(JSON.parse(data));
        return;
      }

      if (eventName === 'error' || eventName === 'cancelled') {
        handlers?.onError?.(data.replace(/\\n/g, '\n'));
        return;
      }

      if (eventName === 'complete') {
        completedResponse = JSON.parse(data) as IterationExecutionResponse;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        if (rawEvent.trim()) {
          parseEvent(rawEvent);
        }
      }
    }

    if (!completedResponse) {
      throw new Error('Iterative streaming execution completed without a final response payload');
    }

    return completedResponse;
  }
}

export const commandsApi = new CommandsApiService();

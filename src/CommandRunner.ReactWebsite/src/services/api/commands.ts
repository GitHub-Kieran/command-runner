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
    handlers?: StreamingHandlers
  ): Promise<CommandExecutionResponse> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5081';
    const response = await fetch(`${apiBaseUrl}/api/commands/execute-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(request)
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

      const data = dataLines.join('\n').replace(/\\n/g, '\n');

      if (eventName === 'stdout') {
        handlers?.onStdout?.(data);
        return;
      }

      if (eventName === 'stderr') {
        handlers?.onStderr?.(data);
        return;
      }

      if (eventName === 'error' || eventName === 'cancelled') {
        handlers?.onError?.(data);
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
}

export const commandsApi = new CommandsApiService();

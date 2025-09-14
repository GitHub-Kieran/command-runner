import { apiClient } from './client';
import {
  CommandExecutionRequest,
  CommandExecutionResponse,
  IterationExecutionResponse,
  ValidationResult
} from './types';

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


  // Stream execution output (if supported by backend)
  async executeCommandWithStreaming(
    request: CommandExecutionRequest,
    onProgress?: (output: string) => void
  ): Promise<CommandExecutionResponse> {
    // For now, use regular execution
    // In future, could implement WebSocket or Server-Sent Events for streaming
    const response = await this.executeCommand(request);

    if (onProgress && response.output) {
      // Simulate streaming by splitting output
      const lines = response.output.split('\n');
      lines.forEach((line, index) => {
        setTimeout(() => onProgress(line), index * 100);
      });
    }

    return response;
  }
}

export const commandsApi = new CommandsApiService();
// API Types based on backend DTOs

export interface CommandDto {
  id: string;
  name: string;
  executable: string;
  arguments: string;
  workingDirectory: string;
  shell: string;
  environmentVariables: Record<string, string>;
  iterationEnabled: boolean;
  requireConfirmation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDto {
  id: string;
  name: string;
  description: string;
  commands: CommandDto[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface FavoriteDirectoryDto {
  id: string;
  path: string;
  name: string;
  createdAt: string;
  usageCount: number;
}

export interface CommandExecutionRequest {
  commandId: string;
  profileId: string;
  workingDirectory?: string;
  isIterative?: boolean;
  iterationOptions?: IterationOptionsDto;
  userConfirmed?: boolean;
}

export interface IterationOptionsDto {
  skipErrors?: boolean;
  stopOnFirstFailure?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  includePatterns?: string[];
  includeRootDirectory?: boolean;
  maxParallelism?: number;
}

export interface CommandExecutionResponse {
  executionId: string;
  wasSuccessful: boolean;
  exitCode: number;
  output: string;
  errorOutput: string;
  executionTime: string;
  startedAt: string;
  completedAt: string;
  executionErrors: string[];
}

export interface IterationExecutionResponse {
  executionId: string;
  isCompleted: boolean;
  wasCancelled: boolean;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  processedItems: number;
  startedAt: string;
  completedAt?: string;
  itemResults: IterationItemResultDto[];
}

export interface IterationItemResultDto {
  itemPath: string;
  wasSuccessful: boolean;
  errorMessage?: string;
  output: string;
  errorOutput: string;
  executionTime?: string;
  executedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
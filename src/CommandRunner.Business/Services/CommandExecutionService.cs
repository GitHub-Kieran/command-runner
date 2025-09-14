using CommandRunner.Business.Models;
using CommandRunner.Data.Models;
using System.Collections.Concurrent;
using System.Diagnostics;

namespace CommandRunner.Business.Services;

/// <summary>
/// Implementation of command execution service
/// </summary>
public class CommandExecutionService : ICommandExecutionService
{
    private readonly ICommandValidationService _validationService;

    public CommandExecutionService(ICommandValidationService validationService)
    {
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
    }

    public async Task<CommandExecutionResult> ExecuteCommandAsync(
        Command command,
        string workingDirectory,
        CancellationToken cancellationToken = default)
    {
        // Validate command before execution
        var validationResult = await _validationService.ValidateCommandAsync(command, workingDirectory);
        if (!validationResult.IsValid)
        {
            return new CommandExecutionResult
            {
                CommandId = command.Id,
                CommandName = command.Name,
                ExitCode = -1,
                ExecutionErrors = validationResult.Errors,
                WorkingDirectory = workingDirectory,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };
        }

        var startTime = DateTime.UtcNow;
        var result = new CommandExecutionResult
        {
            CommandId = command.Id,
            CommandName = command.Name,
            WorkingDirectory = workingDirectory,
            StartedAt = startTime,
            EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables)
        };

        try
        {
            using var process = CreateProcess(command, workingDirectory);

            // Set up output redirection
            var outputBuilder = new System.Text.StringBuilder();
            var errorBuilder = new System.Text.StringBuilder();

            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    outputBuilder.AppendLine(e.Data);
                }
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    errorBuilder.AppendLine(e.Data);
                }
            };

            // Start the process
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            // Wait for exit or cancellation
            using var registration = cancellationToken.Register(() =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        process.Kill();
                        result.WasCancelled = true;
                    }
                }
                catch (Exception ex)
                {
                    result.ExecutionErrors.Add($"Failed to cancel process: {ex.Message}");
                }
            });

            await process.WaitForExitAsync(cancellationToken);

            result.ExitCode = process.ExitCode;
            result.StandardOutput = outputBuilder.ToString();
            result.StandardError = errorBuilder.ToString();
            result.ExecutionTime = DateTime.UtcNow - startTime;
            result.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            result.ExitCode = -1;
            result.ExecutionErrors.Add($"Execution failed: {ex.Message}");
            result.ExecutionTime = DateTime.UtcNow - startTime;
            result.CompletedAt = DateTime.UtcNow;
        }

        return result;
    }

    public async Task<CommandExecutionResult> ExecuteCommandWithStreamingAsync(
        Command command,
        string workingDirectory,
        IProgress<string> outputProgress,
        IProgress<string> errorProgress,
        CancellationToken cancellationToken = default)
    {
        // Validate command before execution
        var validationResult = await _validationService.ValidateCommandAsync(command, workingDirectory);
        if (!validationResult.IsValid)
        {
            return new CommandExecutionResult
            {
                CommandId = command.Id,
                CommandName = command.Name,
                ExitCode = -1,
                ExecutionErrors = validationResult.Errors,
                WorkingDirectory = workingDirectory,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };
        }

        var startTime = DateTime.UtcNow;
        var result = new CommandExecutionResult
        {
            CommandId = command.Id,
            CommandName = command.Name,
            WorkingDirectory = workingDirectory,
            StartedAt = startTime,
            EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables)
        };

        try
        {
            using var process = CreateProcess(command, workingDirectory);

            // Set up real-time output streaming
            process.OutputDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    result.StandardOutput += e.Data + Environment.NewLine;
                    outputProgress?.Report(e.Data);
                }
            };

            process.ErrorDataReceived += (sender, e) =>
            {
                if (e.Data != null)
                {
                    result.StandardError += e.Data + Environment.NewLine;
                    errorProgress?.Report(e.Data);
                }
            };

            // Start the process
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            // Wait for exit or cancellation
            using var registration = cancellationToken.Register(() =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        process.Kill();
                        result.WasCancelled = true;
                    }
                }
                catch (Exception ex)
                {
                    result.ExecutionErrors.Add($"Failed to cancel process: {ex.Message}");
                }
            });

            await process.WaitForExitAsync(cancellationToken);

            result.ExitCode = process.ExitCode;
            result.ExecutionTime = DateTime.UtcNow - startTime;
            result.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            result.ExitCode = -1;
            result.ExecutionErrors.Add($"Execution failed: {ex.Message}");
            result.ExecutionTime = DateTime.UtcNow - startTime;
            result.CompletedAt = DateTime.UtcNow;
        }

        return result;
    }

    public async Task<IEnumerable<CommandExecutionResult>> ExecuteCommandsAsync(
        IEnumerable<Command> commands,
        string workingDirectory,
        IProgress<CommandExecutionResult> progress,
        CancellationToken cancellationToken = default)
    {
        var results = new List<CommandExecutionResult>();

        foreach (var command in commands)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            var result = await ExecuteCommandAsync(command, workingDirectory, cancellationToken);
            results.Add(result);
            progress?.Report(result);
        }

        return results;
    }

    public async Task<IEnumerable<CommandExecutionResult>> ExecuteCommandsParallelAsync(
        IEnumerable<Command> commands,
        string workingDirectory,
        int maxParallelism = 4,
        IProgress<CommandExecutionResult>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var commandList = commands.ToList();
        var results = new ConcurrentBag<CommandExecutionResult>();

        // Use semaphore to limit parallelism
        using var semaphore = new SemaphoreSlim(maxParallelism);

        var tasks = commandList.Select(async command =>
        {
            await semaphore.WaitAsync(cancellationToken);

            try
            {
                var result = await ExecuteCommandAsync(command, workingDirectory, cancellationToken);
                results.Add(result);
                progress?.Report(result);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        // Return results in the order they were added (simplified to avoid potential ordering issues)
        return results;
    }

    private Process CreateProcess(Command command, string workingDirectory)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = command.Executable,
            Arguments = command.Arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        // Set environment variables
        foreach (var envVar in command.EnvironmentVariables)
        {
            startInfo.EnvironmentVariables[envVar.Key] = envVar.Value;
        }

        // Set shell if specified
        if (!string.IsNullOrWhiteSpace(command.Shell))
        {
            if (OperatingSystem.IsWindows())
            {
                // On Windows, use cmd.exe or PowerShell
                startInfo.FileName = GetShellExecutable(command.Shell);
                startInfo.Arguments = $"/c \"{command.Executable} {command.Arguments}\"";
            }
            else
            {
                // On Unix-like systems
                startInfo.FileName = command.Shell;
                startInfo.Arguments = $"-c \"{command.Executable} {command.Arguments}\"";
            }
        }

        return new Process { StartInfo = startInfo };
    }

    private string GetShellExecutable(string shell)
    {
        return shell.ToLowerInvariant() switch
        {
            "cmd" => "cmd.exe",
            "powershell" or "ps" => "powershell.exe",
            "bash" => "bash.exe", // Git Bash or WSL
            _ => shell
        };
    }
}
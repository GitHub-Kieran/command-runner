using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

/// <summary>
/// Service for executing commands
/// </summary>
public interface ICommandExecutionService
{
    /// <summary>
    /// Executes a single command
    /// </summary>
    Task<CommandExecutionResult> ExecuteCommandAsync(
        Command command,
        string workingDirectory,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a command with real-time output streaming
    /// </summary>
    Task<CommandExecutionResult> ExecuteCommandWithStreamingAsync(
        Command command,
        string workingDirectory,
        IProgress<string> outputProgress,
        IProgress<string> errorProgress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes multiple commands sequentially
    /// </summary>
    Task<IEnumerable<CommandExecutionResult>> ExecuteCommandsAsync(
        IEnumerable<Command> commands,
        string workingDirectory,
        IProgress<CommandExecutionResult> progress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes commands in parallel
    /// </summary>
    Task<IEnumerable<CommandExecutionResult>> ExecuteCommandsParallelAsync(
        IEnumerable<Command> commands,
        string workingDirectory,
        int maxParallelism = 4,
        IProgress<CommandExecutionResult>? progress = null,
        CancellationToken cancellationToken = default);
}
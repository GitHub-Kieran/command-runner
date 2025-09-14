using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

/// <summary>
/// Service for validating commands before execution
/// </summary>
public interface ICommandValidationService
{
    /// <summary>
    /// Validates a command for execution
    /// </summary>
    Task<ValidationResult> ValidateCommandAsync(Command command, string workingDirectory);

    /// <summary>
    /// Validates if a command is safe to execute
    /// </summary>
    Task<ValidationResult> ValidateCommandSafetyAsync(Command command);

    /// <summary>
    /// Validates working directory exists and is accessible
    /// </summary>
    Task<ValidationResult> ValidateWorkingDirectoryAsync(string workingDirectory);

    /// <summary>
    /// Validates executable exists and is accessible
    /// </summary>
    Task<ValidationResult> ValidateExecutableAsync(string executable, string workingDirectory);

    /// <summary>
    /// Validates environment variables
    /// </summary>
    Task<ValidationResult> ValidateEnvironmentVariablesAsync(Dictionary<string, string> environmentVariables);
}
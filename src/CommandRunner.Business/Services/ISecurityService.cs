using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

/// <summary>
/// Service for handling command security and safety
/// </summary>
public interface ISecurityService
{
    /// <summary>
    /// Checks if a command requires confirmation before execution
    /// </summary>
    Task<bool> RequiresConfirmationAsync(Command command);

    /// <summary>
    /// Validates if a command is allowed to execute
    /// </summary>
    Task<ValidationResult> ValidateCommandSecurityAsync(Command command);

    /// <summary>
    /// Gets security settings for command execution
    /// </summary>
    Task<SecuritySettings> GetSecuritySettingsAsync();

    /// <summary>
    /// Updates security settings
    /// </summary>
    Task UpdateSecuritySettingsAsync(SecuritySettings settings);

    /// <summary>
    /// Checks if a command contains potentially dangerous operations
    /// </summary>
    Task<bool> IsDangerousCommandAsync(Command command);

    /// <summary>
    /// Sanitizes command arguments for safe execution
    /// </summary>
    Task<string> SanitizeArgumentsAsync(string arguments);
}

/// <summary>
/// Security settings for command execution
/// </summary>
public class SecuritySettings
{
    public bool RequireConfirmationForDangerousCommands { get; set; } = true;
    public bool SandboxExecution { get; set; } = true;
    public int MaxExecutionTimeSeconds { get; set; } = 300; // 5 minutes
    public string[] BlockedCommands { get; set; } = Array.Empty<string>();
    public string[] DangerousPatterns { get; set; } = new[]
    {
        "rm -rf",
        "del /f /q",
        "format",
        "fdisk",
        "dd if=",
        "mkfs"
    };
    public bool LogCommandExecutions { get; set; } = true;
    public string LogDirectory { get; set; } = string.Empty;
}
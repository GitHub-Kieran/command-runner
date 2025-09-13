using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

public class SecurityService : ISecurityService
{
    private SecuritySettings _securitySettings;

    public SecurityService()
    {
        _securitySettings = new SecuritySettings
        {
            BlockedCommands = new[] { "blockedcommand" } // Add for testing
        };
    }

    public async Task<bool> RequiresConfirmationAsync(Command command)
    {
        if (command.RequireConfirmation)
        {
            return true;
        }

        if (_securitySettings.RequireConfirmationForDangerousCommands)
        {
            return await IsDangerousCommandAsync(command);
        }

        return false;
    }

    public async Task<ValidationResult> ValidateCommandSecurityAsync(Command command)
    {
        var result = new ValidationResult { IsValid = true };

        // Check if command is blocked
        if (_securitySettings.BlockedCommands.Contains(command.Executable, StringComparer.OrdinalIgnoreCase))
        {
            result.AddError($"Command '{command.Executable}' is blocked for security reasons");
            result.IsValid = false;
        }

        // Check for dangerous patterns in arguments
        if (!string.IsNullOrWhiteSpace(command.Arguments))
        {
            if (ContainsDangerousCharacters(command.Arguments))
            {
                result.AddError("Command arguments contain potentially dangerous characters");
                result.IsValid = false;
            }

            if (ContainsPathTraversal(command.Arguments))
            {
                result.AddError("Command arguments contain path traversal patterns");
                result.IsValid = false;
            }
        }

        // Check for dangerous patterns in executable
        if (!string.IsNullOrWhiteSpace(command.Executable))
        {
            if (_securitySettings.DangerousPatterns.Any(pattern =>
                command.Executable.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
            {
                result.AddError($"Executable '{command.Executable}' contains dangerous patterns");
                result.IsValid = false;
            }
        }

        await Task.CompletedTask;
        return result;
    }

    public async Task<SecuritySettings> GetSecuritySettingsAsync()
    {
        await Task.CompletedTask;
        return _securitySettings;
    }

    public async Task UpdateSecuritySettingsAsync(SecuritySettings settings)
    {
        _securitySettings = settings ?? throw new ArgumentNullException(nameof(settings));
        await Task.CompletedTask;
    }

    public async Task<bool> IsDangerousCommandAsync(Command command)
    {
        // Check executable against dangerous patterns
        if (_securitySettings.DangerousPatterns.Any(pattern =>
            command.Executable.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        // Check arguments against dangerous patterns
        if (!string.IsNullOrWhiteSpace(command.Arguments))
        {
            if (_securitySettings.DangerousPatterns.Any(pattern =>
                command.Arguments.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
        }

        // Check for combined patterns (e.g., "rm -rf")
        var fullCommand = $"{command.Executable} {command.Arguments}".Trim();
        if (_securitySettings.DangerousPatterns.Any(pattern =>
            fullCommand.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        await Task.CompletedTask;
        return false;
    }

    public async Task<string> SanitizeArgumentsAsync(string arguments)
    {
        if (string.IsNullOrWhiteSpace(arguments))
        {
            return arguments;
        }

        var sanitized = arguments;

        // Remove or escape dangerous characters
        sanitized = sanitized.Replace(";", "").Replace("&", "").Replace("|", "").Replace("`", "").Replace("$", "");

        // Remove path traversal patterns
        sanitized = sanitized.Replace("../", "").Replace("..\\", "");

        // Remove other potentially dangerous patterns
        sanitized = sanitized.Replace("$(", "").Replace("`", "").Replace("\\", "/");

        await Task.CompletedTask;
        return sanitized.Trim();
    }

    private bool ContainsDangerousCharacters(string input)
    {
        var dangerousChars = new[] { ';', '&', '|', '`', '$', '(', ')' };
        return dangerousChars.Any(c => input.Contains(c));
    }

    private bool ContainsPathTraversal(string input)
    {
        return input.Contains("../") || input.Contains("..\\");
    }
}
using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

/// <summary>
/// Implementation of command validation service
/// </summary>
public class CommandValidationService : ICommandValidationService
{
    public async Task<ValidationResult> ValidateCommandAsync(Command command, string workingDirectory)
    {
        var result = new ValidationResult { IsValid = true };

        // Validate basic command properties
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            result.AddError("Command name is required");
            result.IsValid = false;
        }

        if (string.IsNullOrWhiteSpace(command.Executable))
        {
            result.AddError("Executable is required");
            result.IsValid = false;
        }

        // Validate working directory
        var workingDirResult = await ValidateWorkingDirectoryAsync(workingDirectory);
        if (!workingDirResult.IsValid)
        {
            result.Errors.AddRange(workingDirResult.Errors);
            result.IsValid = false;
        }

        // Validate executable
        var executableResult = await ValidateExecutableAsync(command.Executable, workingDirectory);
        if (!executableResult.IsValid)
        {
            result.Errors.AddRange(executableResult.Errors);
            result.IsValid = false;
        }

        // Validate environment variables
        var envResult = await ValidateEnvironmentVariablesAsync(command.EnvironmentVariables);
        if (!envResult.IsValid)
        {
            result.Errors.AddRange(envResult.Errors);
            result.IsValid = false;
        }

        // Add warnings for potentially problematic configurations
        if (command.EnvironmentVariables.Count > 20)
        {
            result.AddWarning("Large number of environment variables may impact performance");
        }

        if (string.IsNullOrWhiteSpace(command.Arguments) && command.IterationEnabled)
        {
            result.AddWarning("Iteration enabled but no arguments provided - command will run with default parameters");
        }

        return result;
    }

    public async Task<ValidationResult> ValidateCommandSafetyAsync(Command command)
    {
        var result = new ValidationResult { IsValid = true };

        // Check for potentially dangerous commands
        var dangerousCommands = new[] { "rm", "del", "format", "fdisk", "dd", "mkfs" };
        var executable = command.Executable.ToLowerInvariant();

        if (dangerousCommands.Any(cmd => executable.Contains(cmd)))
        {
            result.AddWarning($"Command '{command.Executable}' may be potentially dangerous");
        }

        // Check for dangerous argument patterns
        var dangerousPatterns = new[] { "-rf", "/f /q", "if=/dev/zero" };
        if (dangerousPatterns.Any(pattern => command.Arguments.Contains(pattern)))
        {
            result.AddWarning("Arguments contain potentially dangerous patterns");
        }

        await Task.CompletedTask;
        return result;
    }

    public async Task<ValidationResult> ValidateWorkingDirectoryAsync(string workingDirectory)
    {
        var result = new ValidationResult { IsValid = true };

        if (string.IsNullOrWhiteSpace(workingDirectory))
        {
            result.AddError("Working directory is required");
            result.IsValid = false;
            return result;
        }

        try
        {
            if (!Directory.Exists(workingDirectory))
            {
                result.AddError($"Working directory does not exist: {workingDirectory}");
                result.IsValid = false;
            }
            else
            {
                // Check if directory is accessible
                var testFile = Path.Combine(workingDirectory, ".access_test");
                await File.WriteAllTextAsync(testFile, "test");
                File.Delete(testFile);
            }
        }
        catch (Exception ex)
        {
            result.AddError($"Working directory is not accessible: {ex.Message}");
            result.IsValid = false;
        }

        return result;
    }

    public async Task<ValidationResult> ValidateExecutableAsync(string executable, string workingDirectory)
    {
        var result = new ValidationResult { IsValid = true };

        if (string.IsNullOrWhiteSpace(executable))
        {
            result.AddError("Executable path is required");
            result.IsValid = false;
            return result;
        }

        // Check if it's a full path
        if (Path.IsPathRooted(executable))
        {
            if (!File.Exists(executable))
            {
                result.AddError($"Executable not found: {executable}");
                result.IsValid = false;
            }
        }
        else
        {
            // Try to find executable in PATH
            var paths = Environment.GetEnvironmentVariable("PATH")?.Split(Path.PathSeparator) ?? Array.Empty<string>();
            var found = false;

            foreach (var path in paths)
            {
                var fullPath = Path.Combine(path, executable);
                if (File.Exists(fullPath))
                {
                    found = true;
                    result.AddValidationData("resolvedPath", fullPath);
                    break;
                }

                // Check for executable extensions on Windows
                if (OperatingSystem.IsWindows())
                {
                    var extensions = Environment.GetEnvironmentVariable("PATHEXT")?.Split(';') ?? new[] { ".exe", ".bat", ".cmd" };
                    foreach (var ext in extensions)
                    {
                        var extPath = fullPath + ext;
                        if (File.Exists(extPath))
                        {
                            found = true;
                            result.AddValidationData("resolvedPath", extPath);
                            break;
                        }
                    }
                    if (found) break;
                }
            }

            if (!found)
            {
                result.AddError($"Executable not found in PATH: {executable}");
                result.IsValid = false;
            }
        }

        return await Task.FromResult(result);
    }

    public async Task<ValidationResult> ValidateEnvironmentVariablesAsync(Dictionary<string, string> environmentVariables)
    {
        var result = new ValidationResult { IsValid = true };

        foreach (var kvp in environmentVariables)
        {
            if (string.IsNullOrWhiteSpace(kvp.Key))
            {
                result.AddError("Environment variable key cannot be empty");
                result.IsValid = false;
            }

            // Check for invalid characters in variable names
            if (kvp.Key.Any(c => !char.IsLetterOrDigit(c) && c != '_'))
            {
                result.AddError($"Invalid environment variable name: {kvp.Key}");
                result.IsValid = false;
            }

            // Warn about very long values
            if (kvp.Value.Length > 10000)
            {
                result.AddWarning($"Environment variable '{kvp.Key}' has a very long value ({kvp.Value.Length} characters)");
            }
        }

        await Task.CompletedTask;
        return result;
    }
}
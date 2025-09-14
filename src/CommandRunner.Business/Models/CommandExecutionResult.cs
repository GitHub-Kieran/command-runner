namespace CommandRunner.Business.Models;

/// <summary>
/// Represents the result of a command execution
/// </summary>
public class CommandExecutionResult
{
    public string CommandId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public int ExitCode { get; set; }
    public string StandardOutput { get; set; } = string.Empty;
    public string StandardError { get; set; } = string.Empty;
    public TimeSpan ExecutionTime { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public bool WasSuccessful => ExitCode == 0;
    public bool WasCancelled { get; set; }
    public string WorkingDirectory { get; set; } = string.Empty;
    public Dictionary<string, string> EnvironmentVariables { get; set; } = new();
    public List<string> ExecutionErrors { get; set; } = new();
}
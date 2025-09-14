namespace CommandRunner.Data.Models;

public class Command
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Executable { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
    public string Shell { get; set; } = "bash"; // bash, cmd, powershell
    public Dictionary<string, string> EnvironmentVariables { get; set; } = new();
    public bool IterationEnabled { get; set; } = false;
    public bool RequireConfirmation { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
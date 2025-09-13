namespace CommandRunner.Api.DTOs;

public class CommandDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Executable { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
    public string Shell { get; set; } = "bash";
    public Dictionary<string, string> EnvironmentVariables { get; set; } = new();
    public bool IterationEnabled { get; set; } = false;
    public bool RequireConfirmation { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
namespace CommandRunner.Api.DTOs;

public class CommandExecutionRequest
{
    public string CommandId { get; set; } = string.Empty;
    public string ProfileId { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
    public bool IsIterative { get; set; } = false;
    public IterationOptionsDto? IterationOptions { get; set; }
    public bool UserConfirmed { get; set; } = false;
}

public class IterationOptionsDto
{
    public bool SkipErrors { get; set; } = true;
    public bool StopOnFirstFailure { get; set; } = false;
    public int MaxDepth { get; set; } = 10;
    public string[] ExcludePatterns { get; set; } = Array.Empty<string>();
    public string[] IncludePatterns { get; set; } = Array.Empty<string>();
    public bool IncludeRootDirectory { get; set; } = false;
    public int MaxParallelism { get; set; } = 1;
}
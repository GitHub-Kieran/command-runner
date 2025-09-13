namespace CommandRunner.Api.DTOs;

public class CommandExecutionResponse
{
    public string ExecutionId { get; set; } = Guid.NewGuid().ToString();
    public bool WasSuccessful { get; set; }
    public int ExitCode { get; set; }
    public string Output { get; set; } = string.Empty;
    public string ErrorOutput { get; set; } = string.Empty;
    public TimeSpan ExecutionTime { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public List<string> ExecutionErrors { get; set; } = new();
}

public class IterationExecutionResponse
{
    public string ExecutionId { get; set; } = Guid.NewGuid().ToString();
    public bool IsCompleted { get; set; }
    public bool WasCancelled { get; set; }
    public int TotalItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public int SkippedItems { get; set; }
    public int ProcessedItems { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<IterationItemResultDto> ItemResults { get; set; } = new();
}

public class IterationItemResultDto
{
    public string ItemPath { get; set; } = string.Empty;
    public bool WasSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    public string Output { get; set; } = string.Empty;
    public string ErrorOutput { get; set; } = string.Empty;
    public TimeSpan? ExecutionTime { get; set; }
    public DateTime ExecutedAt { get; set; }
}
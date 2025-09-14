namespace CommandRunner.Business.Models;

/// <summary>
/// Represents progress information for iterative command execution
/// </summary>
public class IterationProgress
{
    public string CommandId { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public int ProcessedItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public int SkippedItems { get; set; }
    public string CurrentItem { get; set; } = string.Empty;
    public string CurrentDirectory { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public bool WasCancelled { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan ElapsedTime => CompletedAt.HasValue
        ? CompletedAt.Value - StartedAt
        : DateTime.UtcNow - StartedAt;

    public double ProgressPercentage => TotalItems > 0
        ? (double)ProcessedItems / TotalItems * 100
        : 0;

    public string StatusMessage => IsCompleted
        ? WasCancelled ? "Cancelled" : "Completed"
        : $"Processing {ProcessedItems}/{TotalItems}";

    public List<IterationItemResult> ItemResults { get; set; } = new();
}

/// <summary>
/// Represents the result of executing a command on a single item during iteration
/// </summary>
public class IterationItemResult
{
    public string ItemPath { get; set; } = string.Empty;
    public bool WasSuccessful { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public string Output { get; set; } = string.Empty;
    public string ErrorOutput { get; set; } = string.Empty;
    public TimeSpan ExecutionTime { get; set; }
    public DateTime ExecutedAt { get; set; }
}
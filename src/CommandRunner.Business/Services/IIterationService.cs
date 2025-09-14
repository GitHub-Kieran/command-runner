using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

/// <summary>
/// Service for handling iterative command execution (recursive directory processing)
/// </summary>
public interface IIterationService
{
    /// <summary>
    /// Executes a command iteratively across subdirectories
    /// </summary>
    Task<IterationProgress> ExecuteIterativeAsync(
        Command command,
        string rootDirectory,
        IterationOptions options,
        IProgress<IterationProgress> progress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all subdirectories for iteration
    /// </summary>
    Task<IEnumerable<string>> FindIterationTargetsAsync(
        string rootDirectory,
        IterationOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates iteration options
    /// </summary>
    Task<ValidationResult> ValidateIterationOptionsAsync(
        string rootDirectory,
        IterationOptions options);
}

/// <summary>
/// Options for iterative command execution
/// </summary>
public class IterationOptions
{
    public bool SkipErrors { get; set; } = true;
    public bool StopOnFirstFailure { get; set; } = false;
    public int MaxDepth { get; set; } = 10;
    public string[] ExcludePatterns { get; set; } = Array.Empty<string>();
    public string[] IncludePatterns { get; set; } = Array.Empty<string>();
    public bool IncludeRootDirectory { get; set; } = false;
    public int MaxParallelism { get; set; } = 1; // Sequential by default for safety
}
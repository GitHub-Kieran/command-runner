using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.Business.Services;

public class IterationService : IIterationService
{
    private readonly ICommandExecutionService _executionService;

    public IterationService(ICommandExecutionService executionService)
    {
        _executionService = executionService ?? throw new ArgumentNullException(nameof(executionService));
    }

    public async Task<IterationProgress> ExecuteIterativeAsync(
        Command command,
        string rootDirectory,
        IterationOptions options,
        IProgress<IterationProgress> progress,
        CancellationToken cancellationToken = default)
    {
        var iterationProgress = new IterationProgress
        {
            CommandId = command.Id,
            CommandName = command.Name,
            StartedAt = DateTime.UtcNow
        };

        try
        {
            var targets = await FindIterationTargetsAsync(rootDirectory, options, cancellationToken);
            iterationProgress.TotalItems = targets.Count();

            progress?.Report(iterationProgress);

            foreach (var target in targets)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    iterationProgress.WasCancelled = true;
                    break;
                }

                iterationProgress.CurrentItem = Path.GetFileName(target);
                iterationProgress.CurrentDirectory = target;
                progress?.Report(iterationProgress);

                try
                {
                    var commandForTarget = new Command
                    {
                        Id = command.Id,
                        Name = command.Name,
                        Executable = command.Executable,
                        Arguments = command.Arguments,
                        WorkingDirectory = target,
                        Shell = command.Shell,
                        EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables),
                        IterationEnabled = command.IterationEnabled,
                        RequireConfirmation = command.RequireConfirmation,
                        CreatedAt = command.CreatedAt,
                        UpdatedAt = command.UpdatedAt
                    };

                    var result = await _executionService.ExecuteCommandAsync(
                        commandForTarget,
                        target,
                        cancellationToken);

                    var itemResult = new IterationItemResult
                    {
                        ItemPath = target,
                        WasSuccessful = result.WasSuccessful,
                        ExecutionTime = result.ExecutionTime,
                        ExecutedAt = DateTime.UtcNow
                    };

                    if (!result.WasSuccessful)
                    {
                        itemResult.ErrorMessage = string.Join(Environment.NewLine, result.ExecutionErrors);
                        iterationProgress.FailedItems++;

                        if (!options.SkipErrors)
                        {
                            if (options.StopOnFirstFailure)
                            {
                                iterationProgress.SkippedItems = targets.Count() - iterationProgress.ProcessedItems - 1;
                                break;
                            }
                        }
                    }
                    else
                    {
                        iterationProgress.SuccessfulItems++;
                    }

                    iterationProgress.ItemResults.Add(itemResult);
                }
                catch (Exception ex)
                {
                    iterationProgress.FailedItems++;
                    iterationProgress.ItemResults.Add(new IterationItemResult
                    {
                        ItemPath = target,
                        WasSuccessful = false,
                        ErrorMessage = ex.Message,
                        ExecutedAt = DateTime.UtcNow
                    });

                    if (!options.SkipErrors && options.StopOnFirstFailure)
                    {
                        iterationProgress.SkippedItems = targets.Count() - iterationProgress.ProcessedItems - 1;
                        break;
                    }
                }

                iterationProgress.ProcessedItems++;
                progress?.Report(iterationProgress);
            }

            iterationProgress.IsCompleted = !iterationProgress.WasCancelled && iterationProgress.SkippedItems == 0;
            iterationProgress.CompletedAt = DateTime.UtcNow;
            progress?.Report(iterationProgress);

            return iterationProgress;
        }
        catch (Exception ex)
        {
            iterationProgress.ItemResults.Add(new IterationItemResult
            {
                ItemPath = rootDirectory,
                WasSuccessful = false,
                ErrorMessage = $"Iteration failed: {ex.Message}",
                ExecutedAt = DateTime.UtcNow
            });
            iterationProgress.IsCompleted = false;
            iterationProgress.CompletedAt = DateTime.UtcNow;
            progress?.Report(iterationProgress);

            return iterationProgress;
        }
    }

    public async Task<IEnumerable<string>> FindIterationTargetsAsync(
        string rootDirectory,
        IterationOptions options,
        CancellationToken cancellationToken = default)
    {
        var targets = new List<string>();

        if (!Directory.Exists(rootDirectory))
        {
            throw new DirectoryNotFoundException($"Root directory does not exist: {rootDirectory}");
        }

        if (options.IncludeRootDirectory)
        {
            targets.Add(rootDirectory);
        }

        await FindDirectoriesRecursiveAsync(
            rootDirectory,
            targets,
            options,
            0,
            cancellationToken);

        return targets;
    }

    private async Task FindDirectoriesRecursiveAsync(
        string currentDirectory,
        List<string> targets,
        IterationOptions options,
        int currentDepth,
        CancellationToken cancellationToken)
    {
        if (currentDepth >= options.MaxDepth)
        {
            return;
        }

        try
        {
            var subDirectories = Directory.GetDirectories(currentDirectory);

            foreach (var subDir in subDirectories)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                // Check include patterns
                if (options.IncludePatterns.Length > 0)
                {
                    var relativePath = Path.GetRelativePath(currentDirectory, subDir);
                    if (!options.IncludePatterns.Any(pattern =>
                        Path.GetFileName(subDir).Contains(pattern) ||
                        relativePath.Contains(pattern)))
                    {
                        continue;
                    }
                }

                // Check exclude patterns
                if (options.ExcludePatterns.Length > 0)
                {
                    var relativePath = Path.GetRelativePath(currentDirectory, subDir);
                    if (options.ExcludePatterns.Any(pattern =>
                        Path.GetFileName(subDir).Contains(pattern) ||
                        relativePath.Contains(pattern)))
                    {
                        continue;
                    }
                }

                targets.Add(subDir);

                await FindDirectoriesRecursiveAsync(
                    subDir,
                    targets,
                    options,
                    currentDepth + 1,
                    cancellationToken);
            }
        }
        catch (UnauthorizedAccessException)
        {
            // Skip directories we can't access
        }
        catch (Exception)
        {
            // Skip directories with other errors
        }
    }

    public async Task<ValidationResult> ValidateIterationOptionsAsync(
        string rootDirectory,
        IterationOptions options)
    {
        var result = new ValidationResult { IsValid = true };

        if (string.IsNullOrWhiteSpace(rootDirectory))
        {
            result.AddError("Root directory is required");
            result.IsValid = false;
        }
        else if (!Directory.Exists(rootDirectory))
        {
            result.AddError($"Root directory does not exist: {rootDirectory}");
            result.IsValid = false;
        }

        if (options.MaxDepth < 0)
        {
            result.AddError("Max depth cannot be negative");
            result.IsValid = false;
        }

        if (options.MaxParallelism < 1)
        {
            result.AddError("Max parallelism must be at least 1");
            result.IsValid = false;
        }

        await Task.CompletedTask;
        return result;
    }
}
using Microsoft.AspNetCore.Mvc;
using CommandRunner.Data.Repositories;
using CommandRunner.Data.Models;
using CommandRunner.Business.Services;
using CommandRunner.Api.DTOs;
using System.Text.Json;

namespace CommandRunner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommandsController : ControllerBase
{
    private readonly IProfileRepository _profileRepository;
    private readonly ICommandExecutionService _executionService;
    private readonly IIterationService _iterationService;
    private readonly ISecurityService _securityService;

    public CommandsController(
        IProfileRepository profileRepository,
        ICommandExecutionService executionService,
        IIterationService iterationService,
        ISecurityService securityService)
    {
        _profileRepository = profileRepository;
        _executionService = executionService;
        _iterationService = iterationService;
        _securityService = securityService;
    }

    [HttpPost("execute")]
    public async Task<ActionResult<CommandExecutionResponse>> ExecuteCommand(CommandExecutionRequest request)
    {
        try
        {
            // Get the profile and command
            var profile = await _profileRepository.GetByIdAsync(request.ProfileId);
            if (profile == null)
            {
                return NotFound("Profile not found");
            }

            var command = profile.Commands.FirstOrDefault(c => c.Id == request.CommandId);
            if (command == null)
            {
                return NotFound("Command not found in profile");
            }

            // Check if confirmation is required
            var requiresConfirmation = await _securityService.RequiresConfirmationAsync(command);
            if (requiresConfirmation && !request.UserConfirmed)
            {
                return BadRequest("Command requires confirmation before execution");
            }

            // Execute the command
            var workingDirectory = string.IsNullOrWhiteSpace(request.WorkingDirectory)
                ? command.WorkingDirectory
                : request.WorkingDirectory;

            var commandToExecute = new Command
            {
                Id = command.Id,
                Name = command.Name,
                Executable = command.Executable,
                Arguments = command.Arguments,
                WorkingDirectory = workingDirectory,
                Shell = command.Shell,
                EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables),
                IterationEnabled = command.IterationEnabled,
                RequireConfirmation = command.RequireConfirmation,
                CreatedAt = command.CreatedAt,
                UpdatedAt = command.UpdatedAt
            };

            var result = await _executionService.ExecuteCommandAsync(
                commandToExecute,
                workingDirectory,
                HttpContext.RequestAborted);

            var response = new CommandExecutionResponse
            {
                WasSuccessful = result.WasSuccessful,
                ExitCode = result.ExitCode,
                Output = result.StandardOutput,
                ErrorOutput = result.StandardError,
                ExecutionTime = result.ExecutionTime,
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt,
                ExecutionErrors = result.ExecutionErrors
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Command execution failed: {ex.Message}");
        }
    }

    [HttpPost("execute-stream")]
    public async Task ExecuteCommandStream(CommandExecutionRequest request)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Append("X-Accel-Buffering", "no");

        static string EscapeSseData(string data)
        {
            return data.Replace("\r", "").Replace("\n", "\\n");
        }

        async Task WriteEventAsync(string eventName, string data)
        {
            await Response.WriteAsync($"event: {eventName}\n");
            await Response.WriteAsync($"data: {EscapeSseData(data)}\n\n");
            await Response.Body.FlushAsync();
        }

        try
        {
            var profile = await _profileRepository.GetByIdAsync(request.ProfileId);
            if (profile == null)
            {
                await WriteEventAsync("error", "Profile not found");
                return;
            }

            var command = profile.Commands.FirstOrDefault(c => c.Id == request.CommandId);
            if (command == null)
            {
                await WriteEventAsync("error", "Command not found in profile");
                return;
            }

            var requiresConfirmation = await _securityService.RequiresConfirmationAsync(command);
            if (requiresConfirmation && !request.UserConfirmed)
            {
                await WriteEventAsync("error", "Command requires confirmation before execution");
                return;
            }

            var workingDirectory = string.IsNullOrWhiteSpace(request.WorkingDirectory)
                ? command.WorkingDirectory
                : request.WorkingDirectory;

            var commandToExecute = new Command
            {
                Id = command.Id,
                Name = command.Name,
                Executable = command.Executable,
                Arguments = command.Arguments,
                WorkingDirectory = workingDirectory,
                Shell = command.Shell,
                EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables),
                IterationEnabled = command.IterationEnabled,
                RequireConfirmation = command.RequireConfirmation,
                CreatedAt = command.CreatedAt,
                UpdatedAt = command.UpdatedAt
            };

            var outputProgress = new Progress<string>(line =>
            {
                WriteEventAsync("stdout", line).GetAwaiter().GetResult();
            });

            var errorProgress = new Progress<string>(line =>
            {
                WriteEventAsync("stderr", line).GetAwaiter().GetResult();
            });

            var result = await _executionService.ExecuteCommandWithStreamingAsync(
                commandToExecute,
                workingDirectory,
                outputProgress,
                errorProgress,
                HttpContext.RequestAborted);

            var response = new CommandExecutionResponse
            {
                WasSuccessful = result.WasSuccessful,
                ExitCode = result.ExitCode,
                Output = result.StandardOutput,
                ErrorOutput = result.StandardError,
                ExecutionTime = result.ExecutionTime,
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt,
                ExecutionErrors = result.ExecutionErrors
            };

            await WriteEventAsync("complete", JsonSerializer.Serialize(response));
        }
        catch (OperationCanceledException)
        {
            await WriteEventAsync("cancelled", "Execution cancelled");
        }
        catch (Exception ex)
        {
            await WriteEventAsync("error", $"Command execution failed: {ex.Message}");
        }
    }

    [HttpPost("execute-iterative")]
    public async Task<ActionResult<IterationExecutionResponse>> ExecuteIterativeCommand(CommandExecutionRequest request)
    {
        try
        {
            // Get the profile and command
            var profile = await _profileRepository.GetByIdAsync(request.ProfileId);
            if (profile == null)
            {
                return NotFound("Profile not found");
            }

            var command = profile.Commands.FirstOrDefault(c => c.Id == request.CommandId);
            if (command == null)
            {
                return NotFound("Command not found in profile");
            }

            // Check if confirmation is required
            var requiresConfirmation = await _securityService.RequiresConfirmationAsync(command);
            if (requiresConfirmation && !request.UserConfirmed)
            {
                return BadRequest("Command requires confirmation before execution");
            }

            // Set up iteration options
            var options = request.IterationOptions != null
                ? new CommandRunner.Business.Services.IterationOptions
                {
                    SkipErrors = request.IterationOptions.SkipErrors,
                    StopOnFirstFailure = request.IterationOptions.StopOnFirstFailure,
                    MaxDepth = request.IterationOptions.MaxDepth,
                    ExcludePatterns = request.IterationOptions.ExcludePatterns,
                    IncludePatterns = request.IterationOptions.IncludePatterns,
                    IncludeRootDirectory = request.IterationOptions.IncludeRootDirectory,
                    MaxParallelism = request.IterationOptions.MaxParallelism
                }
                : new CommandRunner.Business.Services.IterationOptions();

            var workingDirectory = string.IsNullOrWhiteSpace(request.WorkingDirectory)
                ? command.WorkingDirectory
                : request.WorkingDirectory;

            // Execute iteratively
            var progress = new Progress<CommandRunner.Business.Models.IterationProgress>();
            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                workingDirectory,
                options,
                progress,
                HttpContext.RequestAborted);

            var response = new IterationExecutionResponse
            {
                IsCompleted = result.IsCompleted,
                WasCancelled = result.WasCancelled,
                TotalItems = result.TotalItems,
                SuccessfulItems = result.SuccessfulItems,
                FailedItems = result.FailedItems,
                SkippedItems = result.SkippedItems,
                ProcessedItems = result.ProcessedItems,
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt,
                ItemResults = result.ItemResults.Select(r => new IterationItemResultDto
                {
                    ItemPath = r.ItemPath,
                    WasSuccessful = r.WasSuccessful,
                    ErrorMessage = r.ErrorMessage,
                    Output = r.Output,
                    ErrorOutput = r.ErrorOutput,
                    ExecutionTime = r.ExecutionTime,
                    ExecutedAt = r.ExecutedAt
                }).ToList()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Iterative command execution failed: {ex.Message}");
        }
    }

    [HttpPost("execute-iterative-stream")]
    public async Task ExecuteIterativeCommandStream(CommandExecutionRequest request)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Append("X-Accel-Buffering", "no");

        static string EscapeSseData(string data)
        {
            return data.Replace("\r", "").Replace("\n", "\\n");
        }

        async Task WriteEventAsync(string eventName, string data)
        {
            await Response.WriteAsync($"event: {eventName}\n");
            await Response.WriteAsync($"data: {EscapeSseData(data)}\n\n");
            await Response.Body.FlushAsync();
        }

        try
        {
            var profile = await _profileRepository.GetByIdAsync(request.ProfileId);
            if (profile == null)
            {
                await WriteEventAsync("error", "Profile not found");
                return;
            }

            var command = profile.Commands.FirstOrDefault(c => c.Id == request.CommandId);
            if (command == null)
            {
                await WriteEventAsync("error", "Command not found in profile");
                return;
            }

            var requiresConfirmation = await _securityService.RequiresConfirmationAsync(command);
            if (requiresConfirmation && !request.UserConfirmed)
            {
                await WriteEventAsync("error", "Command requires confirmation before execution");
                return;
            }

            var options = request.IterationOptions != null
                ? new CommandRunner.Business.Services.IterationOptions
                {
                    SkipErrors = request.IterationOptions.SkipErrors,
                    StopOnFirstFailure = request.IterationOptions.StopOnFirstFailure,
                    MaxDepth = request.IterationOptions.MaxDepth,
                    ExcludePatterns = request.IterationOptions.ExcludePatterns,
                    IncludePatterns = request.IterationOptions.IncludePatterns,
                    IncludeRootDirectory = request.IterationOptions.IncludeRootDirectory,
                    MaxParallelism = request.IterationOptions.MaxParallelism
                }
                : new CommandRunner.Business.Services.IterationOptions();

            var workingDirectory = string.IsNullOrWhiteSpace(request.WorkingDirectory)
                ? command.WorkingDirectory
                : request.WorkingDirectory;

            var commandToExecute = new Command
            {
                Id = command.Id,
                Name = command.Name,
                Executable = command.Executable,
                Arguments = command.Arguments,
                WorkingDirectory = workingDirectory,
                Shell = command.Shell,
                EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables),
                IterationEnabled = command.IterationEnabled,
                RequireConfirmation = command.RequireConfirmation,
                CreatedAt = command.CreatedAt,
                UpdatedAt = command.UpdatedAt
            };

            var startTime = DateTime.UtcNow;
            var targets = (await _iterationService.FindIterationTargetsAsync(
                workingDirectory,
                options,
                HttpContext.RequestAborted)).ToList();

            var iterationProgress = new CommandRunner.Business.Models.IterationProgress
            {
                CommandId = commandToExecute.Id,
                CommandName = commandToExecute.Name,
                StartedAt = startTime,
                TotalItems = targets.Count
            };

            await WriteEventAsync("progress", JsonSerializer.Serialize(new
            {
                iterationProgress.TotalItems,
                iterationProgress.ProcessedItems,
                iterationProgress.SuccessfulItems,
                iterationProgress.FailedItems,
                iterationProgress.SkippedItems,
                iterationProgress.CurrentItem,
                iterationProgress.CurrentDirectory,
                iterationProgress.IsCompleted,
                iterationProgress.WasCancelled,
                iterationProgress.StartedAt,
                iterationProgress.CompletedAt
            }));

            foreach (var target in targets)
            {
                if (HttpContext.RequestAborted.IsCancellationRequested)
                {
                    iterationProgress.WasCancelled = true;
                    break;
                }

                iterationProgress.CurrentItem = Path.GetFileName(target);
                iterationProgress.CurrentDirectory = target;

                await WriteEventAsync("item-start", JsonSerializer.Serialize(new
                {
                    itemPath = target,
                    itemName = iterationProgress.CurrentItem
                }));

                await WriteEventAsync("progress", JsonSerializer.Serialize(new
                {
                    iterationProgress.TotalItems,
                    iterationProgress.ProcessedItems,
                    iterationProgress.SuccessfulItems,
                    iterationProgress.FailedItems,
                    iterationProgress.SkippedItems,
                    iterationProgress.CurrentItem,
                    iterationProgress.CurrentDirectory,
                    iterationProgress.IsCompleted,
                    iterationProgress.WasCancelled,
                    iterationProgress.StartedAt,
                    iterationProgress.CompletedAt
                }));

                var outputProgress = new Progress<string>(line =>
                {
                    WriteEventAsync("stdout", JsonSerializer.Serialize(new { itemPath = target, line })).GetAwaiter().GetResult();
                });

                var errorProgress = new Progress<string>(line =>
                {
                    WriteEventAsync("stderr", JsonSerializer.Serialize(new { itemPath = target, line })).GetAwaiter().GetResult();
                });

                var itemResult = new IterationItemResultDto
                {
                    ItemPath = target,
                    ExecutedAt = DateTime.UtcNow
                };

                try
                {
                    var result = await _executionService.ExecuteCommandWithStreamingAsync(
                        commandToExecute,
                        target,
                        outputProgress,
                        errorProgress,
                        HttpContext.RequestAborted);

                    itemResult.WasSuccessful = result.WasSuccessful;
                    itemResult.Output = result.StandardOutput;
                    itemResult.ErrorOutput = result.StandardError;
                    itemResult.ExecutionTime = result.ExecutionTime;
                    itemResult.ErrorMessage = result.WasSuccessful
                        ? null
                        : string.Join(Environment.NewLine, result.ExecutionErrors);

                    if (result.WasSuccessful)
                    {
                        iterationProgress.SuccessfulItems++;
                    }
                    else
                    {
                        iterationProgress.FailedItems++;
                        if (!options.SkipErrors && options.StopOnFirstFailure)
                        {
                            iterationProgress.SkippedItems = targets.Count - iterationProgress.ProcessedItems - 1;
                            iterationProgress.ProcessedItems++;
                            iterationProgress.ItemResults.Add(new CommandRunner.Business.Models.IterationItemResult
                            {
                                ItemPath = itemResult.ItemPath,
                                WasSuccessful = itemResult.WasSuccessful,
                                ErrorMessage = itemResult.ErrorMessage ?? string.Empty,
                                Output = itemResult.Output,
                                ErrorOutput = itemResult.ErrorOutput,
                                ExecutionTime = itemResult.ExecutionTime ?? TimeSpan.Zero,
                                ExecutedAt = itemResult.ExecutedAt
                            });

                            await WriteEventAsync("item-complete", JsonSerializer.Serialize(itemResult));
                            await WriteEventAsync("progress", JsonSerializer.Serialize(new
                            {
                                iterationProgress.TotalItems,
                                iterationProgress.ProcessedItems,
                                iterationProgress.SuccessfulItems,
                                iterationProgress.FailedItems,
                                iterationProgress.SkippedItems,
                                iterationProgress.CurrentItem,
                                iterationProgress.CurrentDirectory,
                                iterationProgress.IsCompleted,
                                iterationProgress.WasCancelled,
                                iterationProgress.StartedAt,
                                iterationProgress.CompletedAt
                            }));
                            break;
                        }
                    }
                }
                catch (Exception ex)
                {
                    itemResult.WasSuccessful = false;
                    itemResult.ErrorMessage = ex.Message;
                    iterationProgress.FailedItems++;

                    if (!options.SkipErrors && options.StopOnFirstFailure)
                    {
                        iterationProgress.SkippedItems = targets.Count - iterationProgress.ProcessedItems - 1;
                    }
                }

                iterationProgress.ProcessedItems++;
                iterationProgress.ItemResults.Add(new CommandRunner.Business.Models.IterationItemResult
                {
                    ItemPath = itemResult.ItemPath,
                    WasSuccessful = itemResult.WasSuccessful,
                    ErrorMessage = itemResult.ErrorMessage ?? string.Empty,
                    Output = itemResult.Output,
                    ErrorOutput = itemResult.ErrorOutput,
                    ExecutionTime = itemResult.ExecutionTime ?? TimeSpan.Zero,
                    ExecutedAt = itemResult.ExecutedAt
                });

                await WriteEventAsync("item-complete", JsonSerializer.Serialize(itemResult));
                await WriteEventAsync("progress", JsonSerializer.Serialize(new
                {
                    iterationProgress.TotalItems,
                    iterationProgress.ProcessedItems,
                    iterationProgress.SuccessfulItems,
                    iterationProgress.FailedItems,
                    iterationProgress.SkippedItems,
                    iterationProgress.CurrentItem,
                    iterationProgress.CurrentDirectory,
                    iterationProgress.IsCompleted,
                    iterationProgress.WasCancelled,
                    iterationProgress.StartedAt,
                    iterationProgress.CompletedAt
                }));

                if (!itemResult.WasSuccessful && !options.SkipErrors && options.StopOnFirstFailure)
                {
                    break;
                }
            }

            iterationProgress.IsCompleted = !iterationProgress.WasCancelled && iterationProgress.SkippedItems == 0;
            iterationProgress.CompletedAt = DateTime.UtcNow;

            var response = new IterationExecutionResponse
            {
                IsCompleted = iterationProgress.IsCompleted,
                WasCancelled = iterationProgress.WasCancelled,
                TotalItems = iterationProgress.TotalItems,
                SuccessfulItems = iterationProgress.SuccessfulItems,
                FailedItems = iterationProgress.FailedItems,
                SkippedItems = iterationProgress.SkippedItems,
                ProcessedItems = iterationProgress.ProcessedItems,
                StartedAt = iterationProgress.StartedAt,
                CompletedAt = iterationProgress.CompletedAt,
                ItemResults = iterationProgress.ItemResults.Select(r => new IterationItemResultDto
                {
                    ItemPath = r.ItemPath,
                    WasSuccessful = r.WasSuccessful,
                    ErrorMessage = r.ErrorMessage,
                    Output = r.Output,
                    ErrorOutput = r.ErrorOutput,
                    ExecutionTime = r.ExecutionTime,
                    ExecutedAt = r.ExecutedAt
                }).ToList()
            };

            await WriteEventAsync("complete", JsonSerializer.Serialize(response));
        }
        catch (OperationCanceledException)
        {
            await WriteEventAsync("cancelled", "Execution cancelled");
        }
        catch (Exception ex)
        {
            await WriteEventAsync("error", $"Iterative command execution failed: {ex.Message}");
        }
    }

    [HttpPost("validate/{profileId}/{commandId}")]
    public async Task<ActionResult<CommandRunner.Business.Models.ValidationResult>> ValidateCommand(string profileId, string commandId)
    {
        try
        {
            var profile = await _profileRepository.GetByIdAsync(profileId);
            if (profile == null)
            {
                return NotFound("Profile not found");
            }

            var command = profile.Commands.FirstOrDefault(c => c.Id == commandId);
            if (command == null)
            {
                return NotFound("Command not found in profile");
            }

            var result = await _securityService.ValidateCommandSecurityAsync(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Command validation failed: {ex.Message}");
        }
    }

}

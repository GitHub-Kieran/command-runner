using Microsoft.AspNetCore.Mvc;
using CommandRunner.Data.Repositories;
using CommandRunner.Data.Models;
using CommandRunner.Business.Services;
using CommandRunner.Api.DTOs;

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
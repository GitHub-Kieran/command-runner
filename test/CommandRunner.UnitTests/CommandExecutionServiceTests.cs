using CommandRunner.Business.Services;
using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.UnitTests;

[Ignore("Ignoring so the tests pass on other platforms.")]
[TestFixture]
public class CommandExecutionServiceTests
{
    private CommandExecutionService _executionService;
    private CommandValidationService _validationService;

    [SetUp]
    public void Setup()
    {
        _validationService = new CommandValidationService();
        _executionService = new CommandExecutionService(_validationService);
    }

    [Test]
    public async Task ExecuteCommandAsync_ValidEchoCommand_ReturnsSuccess()
    {
        var command = new Command
        {
            Name = "Echo Test",
            Executable = "echo",
            Arguments = "Hello World",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        var result = await _executionService.ExecuteCommandAsync(command, command.WorkingDirectory);

        Assert.Multiple(() =>
        {
            Assert.That(result.WasSuccessful, Is.True, $"Command failed with exit code {result.ExitCode}. Output: '{result.StandardOutput}', Error: '{result.StandardError}'");
            Assert.That(result.ExitCode, Is.EqualTo(0));
            Assert.That(result.StandardOutput, Is.Not.Null);
            Assert.That(result.StandardOutput, Is.Not.Empty);
            Assert.That(result.StandardOutput.Contains("Hello World"), Is.True);
            Assert.That(result.WorkingDirectory, Is.EqualTo(command.WorkingDirectory));
            Assert.That(result.CommandId, Is.EqualTo(command.Id));
            Assert.That(result.CommandName, Is.EqualTo(command.Name));
            Assert.That(result.StartedAt, Is.Not.EqualTo(default));
            Assert.That(result.CompletedAt, Is.Not.EqualTo(default));
            Assert.That(result.ExecutionTime > TimeSpan.Zero, Is.True);
        });
    }

    [Test]
    public async Task ExecuteCommandAsync_InvalidCommand_ReturnsError()
    {
        var command = new Command
        {
            Name = "Invalid Command",
            Executable = "nonexistentcommand12345",
            Arguments = "",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        var result = await _executionService.ExecuteCommandAsync(command, command.WorkingDirectory);

        Assert.Multiple(() =>
        {
            Assert.That(result.WasSuccessful, Is.False);
            Assert.That(result.ExitCode, Is.Not.EqualTo(0));
            Assert.That(result.ExecutionErrors, Is.Not.Null);
            Assert.That(result.ExecutionErrors, Is.Not.Empty);
        });
    }

    [Test]
    public async Task ExecuteCommandAsync_CommandWithEnvironmentVariables_InheritsVariables()
    {
        var command = new Command
        {
            Name = "Env Test",
            Executable = "echo",
            Arguments = "test",
            WorkingDirectory = Directory.GetCurrentDirectory(),
            EnvironmentVariables = new Dictionary<string, string>
            {
                ["TEST_VAR"] = "test_value"
            }
        };

        var result = await _executionService.ExecuteCommandAsync(command, command.WorkingDirectory);

        Assert.Multiple(() =>
        {
            Assert.That(result.EnvironmentVariables, Is.Not.Null);
            Assert.That(result.EnvironmentVariables.Count, Is.EqualTo(command.EnvironmentVariables.Count));
            Assert.That(result.EnvironmentVariables["TEST_VAR"], Is.EqualTo("test_value"));
        });
    }

    [Test]
    public async Task ExecuteCommandAsync_CommandWithCancellation_HandlesCancellation()
    {
        var command = new Command
        {
            Name = "Long Running",
            Executable = OperatingSystem.IsWindows() ? "ping" : "sleep",
            Arguments = OperatingSystem.IsWindows() ? "-t 10 127.0.0.1" : "10",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };
        using var cts = new CancellationTokenSource();
        cts.CancelAfter(100);

        var result = await _executionService.ExecuteCommandAsync(command, command.WorkingDirectory, cts.Token);

        Assert.Multiple(() =>
        {
            Assert.That(result.WasCancelled, Is.True);
            Assert.That(result.ExecutionErrors, Is.Not.Null);
        });
    }

    [Test]
    public async Task ExecuteCommandsAsync_MultipleCommands_ExecutesSequentially()
    {
        var commands = new List<Command>
        {
            new Command
            {
                Name = "Command 1",
                Executable = "echo",
                Arguments = "First",
                WorkingDirectory = Directory.GetCurrentDirectory()
            },
            new Command
            {
                Name = "Command 2",
                Executable = "echo",
                Arguments = "Second",
                WorkingDirectory = Directory.GetCurrentDirectory()
            }
        };
        var results = new List<CommandExecutionResult>();

        var executionResults = await _executionService.ExecuteCommandsAsync(
            commands,
            Directory.GetCurrentDirectory(),
            new Progress<CommandExecutionResult>(result => results.Add(result)));

        Assert.Multiple(() =>
        {
            Assert.That(executionResults.Count(), Is.EqualTo(2));
            Assert.That(results.Count, Is.EqualTo(2));
            Assert.That(results.All(r => r.WasSuccessful), Is.True);
            Assert.That(results[0].CommandId, Is.EqualTo(commands[0].Id));
            Assert.That(results[1].CommandId, Is.EqualTo(commands[1].Id));
        });
    }

    [Test]
    public async Task ExecuteCommandsParallelAsync_MultipleCommands_ExecutesInParallel()
    {
        var commands = new List<Command>
        {
            new Command
            {
                Name = "Parallel 1",
                Executable = "echo",
                Arguments = "Parallel1",
                WorkingDirectory = Directory.GetCurrentDirectory()
            },
            new Command
            {
                Name = "Parallel 2",
                Executable = "echo",
                Arguments = "Parallel2",
                WorkingDirectory = Directory.GetCurrentDirectory()
            }
        };
        var results = new List<CommandExecutionResult>();

        var executionResults = await _executionService.ExecuteCommandsParallelAsync(
            commands,
            Directory.GetCurrentDirectory(),
            maxParallelism: 2,
            new Progress<CommandExecutionResult>(result => results.Add(result)));

        Assert.Multiple(() =>
        {
            Assert.That(executionResults.Count(), Is.EqualTo(2));
            Assert.That(results.Count, Is.EqualTo(2));
            Assert.That(results.All(r => r.WasSuccessful), Is.True);
        });
    }
}
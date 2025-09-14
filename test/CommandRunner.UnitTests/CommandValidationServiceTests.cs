using NUnit.Framework;
using CommandRunner.Business.Services;
using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.UnitTests;

[TestFixture]
public class CommandValidationServiceTests
{
    private CommandValidationService _validationService;

    [SetUp]
    public void Setup()
    {
        _validationService = new CommandValidationService();
    }

    [Test]
    public async Task ValidateCommandAsync_ValidCommand_ReturnsSuccess()
    {
        var command = new Command
        {
            Name = "Test Command",
            Executable = "echo",
            Arguments = "Hello World",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        var result = await _validationService.ValidateCommandAsync(command, command.WorkingDirectory);

        Assert.IsTrue(result.IsValid);
        Assert.IsEmpty(result.Errors);
    }

    [Test]
    public async Task ValidateCommandAsync_CommandWithoutName_ReturnsError()
    {
        var command = new Command
        {
            Name = "",
            Executable = "echo",
            Arguments = "test",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        var result = await _validationService.ValidateCommandAsync(command, command.WorkingDirectory);

        Assert.Multiple(() =>
        {
            Assert.IsFalse(result.IsValid);
            Assert.Contains("Command name is required", result.Errors);
        });
    }

    [Test]
    public async Task ValidateCommandAsync_CommandWithoutExecutable_ReturnsError()
    {
        var command = new Command
        {
            Name = "Test Command",
            Executable = "",
            Arguments = "test",
            WorkingDirectory = Directory.GetCurrentDirectory()
        };

        var result = await _validationService.ValidateCommandAsync(command, command.WorkingDirectory);

        Assert.Multiple(() =>
        {
            Assert.IsFalse(result.IsValid);
            Assert.Contains("Executable is required", result.Errors);
        });
    }

    [Test]
    public async Task ValidateCommandAsync_InvalidWorkingDirectory_ReturnsError()
    {
        var command = new Command
        {
            Name = "Test Command",
            Executable = "echo",
            Arguments = "test"
        };
        var invalidDirectory = "/nonexistent/directory/path";

        var result = await _validationService.ValidateCommandAsync(command, invalidDirectory);

        Assert.IsFalse(result.IsValid);
        Assert.Contains($"Working directory does not exist: {invalidDirectory}", result.Errors);
    }

    [Test]
    public async Task ValidateCommandAsync_CommandWithManyEnvironmentVariables_AddsWarning()
    {
        var command = new Command
        {
            Name = "Test Command",
            Executable = "echo",
            Arguments = "test",
            WorkingDirectory = Directory.GetCurrentDirectory(),
            EnvironmentVariables = Enumerable.Range(1, 25)
                .ToDictionary(i => $"VAR{i}", i => $"value{i}")
        };

        var result = await _validationService.ValidateCommandAsync(command, command.WorkingDirectory);

        Assert.IsTrue(result.IsValid);
        Assert.Contains("Large number of environment variables may impact performance", result.Warnings);
    }

    [Test]
    public async Task ValidateCommandAsync_IterationEnabledWithoutArguments_AddsWarning()
    {
        var command = new Command
        {
            Name = "Test Command",
            Executable = "echo",
            Arguments = "",
            WorkingDirectory = Directory.GetCurrentDirectory(),
            IterationEnabled = true
        };

        var result = await _validationService.ValidateCommandAsync(command, command.WorkingDirectory);

        Assert.IsTrue(result.IsValid);
        Assert.Contains("Iteration enabled but no arguments provided - command will run with default parameters", result.Warnings);
    }

    [Test]
    public async Task ValidateWorkingDirectoryAsync_ValidDirectory_ReturnsSuccess()
    {
        var validDirectory = Directory.GetCurrentDirectory();

        var result = await _validationService.ValidateWorkingDirectoryAsync(validDirectory);

        Assert.IsTrue(result.IsValid);
        Assert.IsEmpty(result.Errors);
    }

    [Test]
    public async Task ValidateWorkingDirectoryAsync_NonexistentDirectory_ReturnsError()
    {
        var invalidDirectory = "/definitely/does/not/exist";

        var result = await _validationService.ValidateWorkingDirectoryAsync(invalidDirectory);

        Assert.IsFalse(result.IsValid);
        Assert.Contains($"Working directory does not exist: {invalidDirectory}", result.Errors);
    }

    [Test]
    public async Task ValidateWorkingDirectoryAsync_EmptyDirectory_ReturnsError()
    {
        var result = await _validationService.ValidateWorkingDirectoryAsync("");

        Assert.IsFalse(result.IsValid);
        Assert.Contains("Working directory is required", result.Errors);
    }

    [Test]
    public async Task ValidateExecutableAsync_ValidExecutableInPath_ReturnsSuccess()
    {
        var executable = OperatingSystem.IsWindows() ? "cmd.exe" : "echo";

        var result = await _validationService.ValidateExecutableAsync(executable, Directory.GetCurrentDirectory());

        Assert.IsTrue(result.IsValid);
        Assert.IsEmpty(result.Errors);
    }

    [Test]
    public async Task ValidateExecutableAsync_NonexistentExecutable_ReturnsError()
    {
        var nonexistentExecutable = "definitelynotanexecutable12345";

        var result = await _validationService.ValidateExecutableAsync(nonexistentExecutable, Directory.GetCurrentDirectory());

        Assert.IsFalse(result.IsValid);
        Assert.Contains($"Executable not found in PATH: {nonexistentExecutable}", result.Errors);
    }

    [Test]
    public async Task ValidateEnvironmentVariablesAsync_ValidVariables_ReturnsSuccess()
    {
        var envVars = new Dictionary<string, string>
        {
            ["PATH"] = "/usr/bin",
            ["HOME"] = "/home/user",
            ["MY_VAR"] = "my_value"
        };

        var result = await _validationService.ValidateEnvironmentVariablesAsync(envVars);

        Assert.IsTrue(result.IsValid);
        Assert.IsEmpty(result.Errors);
    }

    [Test]
    public async Task ValidateEnvironmentVariablesAsync_InvalidVariableName_ReturnsError()
    {
        var envVars = new Dictionary<string, string>
        {
            ["INVALID-NAME"] = "value"
        };

        var result = await _validationService.ValidateEnvironmentVariablesAsync(envVars);

        Assert.IsFalse(result.IsValid);
        Assert.Contains("Invalid environment variable name: INVALID-NAME", result.Errors);
    }

    [Test]
    public async Task ValidateEnvironmentVariablesAsync_EmptyVariableName_ReturnsError()
    {
        var envVars = new Dictionary<string, string>
        {
            [""] = "value"
        };

        var result = await _validationService.ValidateEnvironmentVariablesAsync(envVars);

        Assert.IsFalse(result.IsValid);
        Assert.Contains("Environment variable key cannot be empty", result.Errors);
    }

    [Test]
    public async Task ValidateEnvironmentVariablesAsync_VeryLongValue_AddsWarning()
    {
        var longValue = new string('x', 10001);
        var envVars = new Dictionary<string, string>
        {
            ["LONG_VAR"] = longValue
        };

        var result = await _validationService.ValidateEnvironmentVariablesAsync(envVars);

        Assert.IsTrue(result.IsValid);
        Assert.Contains("Environment variable 'LONG_VAR' has a very long value (10001 characters)", result.Warnings);
    }
}
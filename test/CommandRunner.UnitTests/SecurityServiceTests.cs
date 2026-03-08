using NUnit.Framework;
using CommandRunner.Business.Services;
using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.UnitTests;

[TestFixture]
public class SecurityServiceTests
{
    private SecurityService _securityService;

    [SetUp]
    public void Setup()
    {
        _securityService = new SecurityService();
    }

    [Test]
    public async Task RequiresConfirmationAsync_DangerousCommand_ReturnsTrue()
    {
        var command = new Command
        {
            Name = "Dangerous Command",
            Executable = "rm",
            Arguments = "-rf /",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.RequiresConfirmationAsync(command);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task RequiresConfirmationAsync_SafeCommand_ReturnsFalse()
    {
        var command = new Command
        {
            Name = "Safe Command",
            Executable = "echo",
            Arguments = "Hello World",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.RequiresConfirmationAsync(command);

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task RequiresConfirmationAsync_CommandWithRequireConfirmationFlag_ReturnsTrue()
    {
        var command = new Command
        {
            Name = "Safe Command",
            Executable = "echo",
            Arguments = "Hello World",
            WorkingDirectory = "/tmp",
            RequireConfirmation = true
        };

        var result = await _securityService.RequiresConfirmationAsync(command);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task ValidateCommandSecurityAsync_BlockedCommand_ReturnsError()
    {
        var command = new Command
        {
            Name = "Blocked Command",
            Executable = "blockedcommand",
            Arguments = "",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.ValidateCommandSecurityAsync(command);

        Assert.Multiple(() =>
        {
            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Errors, Does.Contain("Command 'blockedcommand' is blocked for security reasons"));
        });
    }

    [Test]
    public async Task ValidateCommandSecurityAsync_ValidCommand_ReturnsSuccess()
    {
        var command = new Command
        {
            Name = "Valid Command",
            Executable = "echo",
            Arguments = "test",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.ValidateCommandSecurityAsync(command);

        Assert.Multiple(() =>
        {
            Assert.That(result.IsValid, Is.True);
            Assert.That(result.Errors, Is.Empty);
        });
    }

    [Test]
    public async Task GetSecuritySettingsAsync_ReturnsDefaultSettings()
    {
        var settings = await _securityService.GetSecuritySettingsAsync();

        Assert.Multiple(() =>
        {
            Assert.That(settings, Is.Not.Null);
            Assert.That(settings.RequireConfirmationForDangerousCommands, Is.True);
            Assert.That(settings.SandboxExecution, Is.True);
            Assert.That(settings.MaxExecutionTimeSeconds, Is.EqualTo(300));
            Assert.That(settings.BlockedCommands, Is.Not.Null);
            Assert.That(settings.DangerousPatterns, Is.Not.Null);
            Assert.That(settings.LogCommandExecutions, Is.True);
        });
    }

    [Test]
    public async Task UpdateSecuritySettingsAsync_ValidSettings_UpdatesSuccessfully()
    {
        var newSettings = new SecuritySettings
        {
            RequireConfirmationForDangerousCommands = false,
            SandboxExecution = false,
            MaxExecutionTimeSeconds = 600,
            BlockedCommands = new[] { "testblock" },
            DangerousPatterns = new[] { "testpattern" },
            LogCommandExecutions = false,
            LogDirectory = "/var/log"
        };

        await _securityService.UpdateSecuritySettingsAsync(newSettings);

        var retrievedSettings = await _securityService.GetSecuritySettingsAsync();

        Assert.Multiple(() =>
        {
            Assert.That(retrievedSettings.RequireConfirmationForDangerousCommands, Is.False);
            Assert.That(retrievedSettings.SandboxExecution, Is.False);
            Assert.That(retrievedSettings.MaxExecutionTimeSeconds, Is.EqualTo(600));
            Assert.That(retrievedSettings.BlockedCommands, Does.Contain("testblock"));
            Assert.That(retrievedSettings.DangerousPatterns, Does.Contain("testpattern"));
            Assert.That(retrievedSettings.LogCommandExecutions, Is.False);
            Assert.That(retrievedSettings.LogDirectory, Is.EqualTo("/var/log"));
        });
    }

    [Test]
    public async Task IsDangerousCommandAsync_CommandWithDangerousPattern_ReturnsTrue()
    {
        var command = new Command
        {
            Name = "Dangerous Command",
            Executable = "rm",
            Arguments = "-rf /home/user",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.IsDangerousCommandAsync(command);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task IsDangerousCommandAsync_CommandWithFormatPattern_ReturnsTrue()
    {
        var command = new Command
        {
            Name = "Format Command",
            Executable = "format",
            Arguments = "C:",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.IsDangerousCommandAsync(command);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task IsDangerousCommandAsync_SafeCommand_ReturnsFalse()
    {
        var command = new Command
        {
            Name = "Safe Command",
            Executable = "ls",
            Arguments = "-la",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.IsDangerousCommandAsync(command);

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task SanitizeArgumentsAsync_ArgumentsWithInjection_ReturnsSanitized()
    {
        var dangerousArgs = "test; rm -rf /; echo";

        var result = await _securityService.SanitizeArgumentsAsync(dangerousArgs);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(result, Is.Not.EqualTo(dangerousArgs));
            Assert.That(result, Does.Not.Contain(";"));
        });
    }

    [Test]
    public async Task SanitizeArgumentsAsync_SafeArguments_ReturnsUnchanged()
    {
        var safeArgs = "file.txt --verbose --output=result.txt";

        var result = await _securityService.SanitizeArgumentsAsync(safeArgs);

        Assert.That(result, Is.EqualTo(safeArgs));
    }

    [Test]
    public async Task SanitizeArgumentsAsync_ArgumentsWithPathTraversal_ReturnsSanitized()
    {
        var dangerousArgs = "../../../etc/passwd";

        var result = await _securityService.SanitizeArgumentsAsync(dangerousArgs);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(result, Does.Not.Contain("../"));
        });
    }

    [Test]
    public async Task ValidateCommandSecurityAsync_CommandWithInjection_ReturnsError()
    {
        var command = new Command
        {
            Name = "Injection Command",
            Executable = "echo",
            Arguments = "test; rm -rf /",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.ValidateCommandSecurityAsync(command);

        Assert.Multiple(() =>
        {
            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Errors, Does.Contain("Command arguments contain potentially dangerous characters"));
        });
    }

    [Test]
    public async Task ValidateCommandSecurityAsync_CommandWithPathTraversal_ReturnsError()
    {
        var command = new Command
        {
            Name = "Traversal Command",
            Executable = "cat",
            Arguments = "../../../etc/passwd",
            WorkingDirectory = "/tmp"
        };

        var result = await _securityService.ValidateCommandSecurityAsync(command);

        Assert.Multiple(() =>
        {
            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Errors, Does.Contain("Command arguments contain path traversal patterns"));
        });
    }
}

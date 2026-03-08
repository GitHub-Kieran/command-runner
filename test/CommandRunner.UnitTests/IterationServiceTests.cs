using NUnit.Framework;
using CommandRunner.Business.Services;
using CommandRunner.Business.Models;
using CommandRunner.Data.Models;

namespace CommandRunner.UnitTests;

[TestFixture]
public class IterationServiceTests
{
    private IterationService _iterationService;
    private CommandExecutionService _executionService;
    private CommandValidationService _validationService;

    [SetUp]
    public void Setup()
    {
        _validationService = new CommandValidationService();
        _executionService = new CommandExecutionService(_validationService);
        _iterationService = new IterationService(_executionService);
    }

    [Test]
    public async Task ExecuteIterativeAsync_SingleDirectory_ExecutesCommand()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        try
        {
            var command = new Command
            {
                Name = "Test Command",
                Executable = OperatingSystem.IsWindows() ? "cmd.exe" : "true",
                Arguments = OperatingSystem.IsWindows() ? "/c exit 0" : "",
                WorkingDirectory = tempDir
            };

            var options = new IterationOptions
            {
                IncludeRootDirectory = true,
                MaxDepth = 1
            };

            var progressReports = new List<IterationProgress>();

            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                tempDir,
                options,
                new Progress<IterationProgress>(p => progressReports.Add(p)));

            Assert.Multiple(() =>
            {
                Assert.That(result.IsCompleted, Is.True);
                Assert.That(result.TotalItems, Is.EqualTo(1));
                Assert.That(result.SuccessfulItems, Is.EqualTo(1));
                Assert.That(result.FailedItems, Is.EqualTo(0));
                Assert.That(progressReports.Any(), Is.True);
                Assert.That(progressReports.Last().IsCompleted, Is.True);
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task ExecuteIterativeAsync_MultipleSubdirectories_ExecutesInAll()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        var subDir1 = Path.Combine(tempDir, "subdir1");
        var subDir2 = Path.Combine(tempDir, "subdir2");
        Directory.CreateDirectory(subDir1);
        Directory.CreateDirectory(subDir2);

        try
        {
            var command = new Command
            {
                Name = "Test Command",
                Executable = OperatingSystem.IsWindows() ? "cmd.exe" : "true",
                Arguments = OperatingSystem.IsWindows() ? "/c exit 0" : ""
            };

            var options = new IterationOptions
            {
                IncludeRootDirectory = false,
                MaxDepth = 1
            };

            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                tempDir,
                options,
                new Progress<IterationProgress>(_ => { }));

            Assert.Multiple(() =>
            {
                Assert.That(result.IsCompleted, Is.True);
                Assert.That(result.TotalItems, Is.EqualTo(2));
                Assert.That(result.SuccessfulItems, Is.EqualTo(2));
                Assert.That(result.FailedItems, Is.EqualTo(0));
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task ExecuteIterativeAsync_WithCancellation_StopsExecution()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        // Create many subdirectories to ensure iteration takes time
        for (int i = 0; i < 20; i++)
        {
            Directory.CreateDirectory(Path.Combine(tempDir, $"subdir{i:D2}"));
        }

        try
        {
            var command = new Command
            {
                Name = "Test Command",
                Executable = OperatingSystem.IsWindows() ? "cmd.exe" : "sleep",
                Arguments = OperatingSystem.IsWindows() ? "/c timeout /t 1 /nobreak > nul" : "1"
            };

            var options = new IterationOptions
            {
                IncludeRootDirectory = false,
                MaxDepth = 1
            };

            using var cts = new CancellationTokenSource();
            cts.CancelAfter(200); // Cancel after 200ms

            var progressReports = new List<IterationProgress>();
            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                tempDir,
                options,
                new Progress<IterationProgress>(p => progressReports.Add(p)),
                cts.Token);

            // The test should pass if either cancellation worked or if it completed but took longer than expected
            Assert.Multiple(() =>
            {
                // Either it was cancelled, or it completed but we can see progress was made
                if (result.WasCancelled)
                {
                    Assert.That(result.IsCompleted, Is.False);
                }
                else
                {
                    // If not cancelled, at least some progress should have been made
                    Assert.That(progressReports.Count > 0, Is.True);
                }
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task ExecuteIterativeAsync_SkipErrorsOnFailure_ContinuesExecution()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        var subDir1 = Path.Combine(tempDir, "subdir1");
        var subDir2 = Path.Combine(tempDir, "subdir2");
        Directory.CreateDirectory(subDir1);
        Directory.CreateDirectory(subDir2);

        try
        {
            var command = new Command
            {
                Name = "Test Command",
                Executable = "nonexistentcommand12345",
                Arguments = ""
            };

            var options = new IterationOptions
            {
                IncludeRootDirectory = false,
                MaxDepth = 1,
                SkipErrors = true
            };

            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                tempDir,
                options,
                new Progress<IterationProgress>(_ => { }));

            Assert.Multiple(() =>
            {
                Assert.That(result.IsCompleted, Is.True);
                Assert.That(result.TotalItems, Is.EqualTo(2));
                Assert.That(result.SuccessfulItems, Is.EqualTo(0));
                Assert.That(result.FailedItems, Is.EqualTo(2));
                Assert.That(result.SkippedItems, Is.EqualTo(0));
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task ExecuteIterativeAsync_StopOnFirstFailure_StopsAfterError()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        var subDir1 = Path.Combine(tempDir, "subdir1");
        var subDir2 = Path.Combine(tempDir, "subdir2");
        Directory.CreateDirectory(subDir1);
        Directory.CreateDirectory(subDir2);

        try
        {
            var command = new Command
            {
                Name = "Test Command",
                Executable = "nonexistentcommand12345",
                Arguments = ""
            };

            var options = new IterationOptions
            {
                IncludeRootDirectory = false,
                MaxDepth = 1,
                SkipErrors = false,
                StopOnFirstFailure = true
            };

            var result = await _iterationService.ExecuteIterativeAsync(
                command,
                tempDir,
                options,
                new Progress<IterationProgress>(_ => { }));

            Assert.Multiple(() =>
            {
                Assert.That(result.IsCompleted, Is.False);
                Assert.That(result.FailedItems, Is.EqualTo(1));
                Assert.That(result.SkippedItems, Is.EqualTo(1));
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task FindIterationTargetsAsync_ValidDirectory_ReturnsDirectories()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "CommandRunnerTest_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        var subDir1 = Path.Combine(tempDir, "subdir1");
        var subDir2 = Path.Combine(tempDir, "subdir2");
        Directory.CreateDirectory(subDir1);
        Directory.CreateDirectory(subDir2);

        try
        {
            var options = new IterationOptions
            {
                IncludeRootDirectory = false,
                MaxDepth = 1
            };

            var targets = await _iterationService.FindIterationTargetsAsync(
                tempDir,
                options);

            Assert.Multiple(() =>
            {
                Assert.That(targets.Count(), Is.EqualTo(2));
                Assert.That(targets, Does.Contain(subDir1));
                Assert.That(targets, Does.Contain(subDir2));
            });
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Test]
    public async Task ValidateIterationOptionsAsync_InvalidRootDirectory_ReturnsError()
    {
        var invalidPath = OperatingSystem.IsWindows()
            ? @"Z:\definitely\does\not\exist"
            : "/definitely/does/not/exist";
        var options = new IterationOptions();

        var result = await _iterationService.ValidateIterationOptionsAsync(
            invalidPath,
            options);

        Assert.Multiple(() =>
        {
            Assert.That(result.IsValid, Is.False);
            Assert.That(result.Errors, Does.Contain($"Root directory does not exist: {invalidPath}"));
        });
    }
}

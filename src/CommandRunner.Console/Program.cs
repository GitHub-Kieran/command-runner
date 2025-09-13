using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using CommandRunner.Api.DTOs;

namespace CommandRunner.ConsoleApp;

class Program
{
    private static readonly HttpClient _httpClient = new()
    {
        BaseAddress = new Uri("http://localhost:5081")
    };

    static async Task Main(string[] args)
    {
        Console.WriteLine("🖥️  Command Runner Console Test");
        Console.WriteLine("===============================");

        try
        {
            // Test 1: Get all profiles
            Console.WriteLine("\n📋 Test 1: Getting all profiles...");
            var profiles = await GetProfilesAsync();
            Console.WriteLine($"Found {profiles.Count} profiles");

            // Test 2: Create a test profile
            Console.WriteLine("\n➕ Test 2: Creating test profile...");
            var testProfile = await CreateTestProfileAsync();
            Console.WriteLine($"Created profile: {testProfile.Name} (ID: {testProfile.Id})");

            // Test 3: Execute a command
            Console.WriteLine("\n🚀 Test 3: Executing command...");
            if (testProfile.Commands.Any())
            {
                var command = testProfile.Commands.First();
                var result = await ExecuteCommandAsync(command.Id, testProfile.Id);
                Console.WriteLine($"Command executed: {result.WasSuccessful}");
                if (!string.IsNullOrEmpty(result.Output))
                {
                    Console.WriteLine($"Output: {result.Output}");
                }
            }

            // Test 4: Get updated profiles
            Console.WriteLine("\n📋 Test 4: Getting updated profiles...");
            profiles = await GetProfilesAsync();
            Console.WriteLine($"Total profiles: {profiles.Count}");

            Console.WriteLine("\n✅ All tests completed successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
        }
    }

    private static async Task<List<ProfileDto>> GetProfilesAsync()
    {
        var response = await _httpClient.GetAsync("/api/profiles");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<ProfileDto>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<ProfileDto>();
    }

    private static async Task<ProfileDto> CreateTestProfileAsync()
    {
        var profile = new ProfileDto
        {
            Name = $"Console Test Profile {DateTime.Now:yyyyMMddHHmmss}",
            Description = "Profile created from console test",
            Commands = new List<CommandDto>
            {
                new CommandDto
                {
                    Name = "List Directory",
                    Executable = "ls",
                    Arguments = "-la",
                    WorkingDirectory = "~/",
                    Shell = "bash",
                    IterationEnabled = false,
                    RequireConfirmation = false
                }
            },
            IsFavorite = false
        };

        var response = await _httpClient.PostAsJsonAsync("/api/profiles", profile);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ProfileDto>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    private static async Task<CommandExecutionResponse> ExecuteCommandAsync(string commandId, string profileId)
    {
        var request = new CommandExecutionRequest
        {
            CommandId = commandId,
            ProfileId = profileId,
            WorkingDirectory = "~/",
            IsIterative = false
        };

        var response = await _httpClient.PostAsJsonAsync("/api/commands/execute", request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<CommandExecutionResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }
}
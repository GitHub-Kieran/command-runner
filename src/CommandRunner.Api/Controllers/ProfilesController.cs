using Microsoft.AspNetCore.Mvc;
using CommandRunner.Data.Repositories;
using CommandRunner.Data.Models;
using CommandRunner.Api.DTOs;

namespace CommandRunner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly IProfileRepository _profileRepository;

    public ProfilesController(IProfileRepository profileRepository)
    {
        _profileRepository = profileRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProfileDto>>> GetAllProfiles()
    {
        var profiles = await _profileRepository.GetAllAsync();
        var profileDtos = profiles.Select(MapToDto);
        return Ok(profileDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProfileDto>> GetProfile(string id)
    {
        var profile = await _profileRepository.GetByIdAsync(id);
        if (profile == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(profile));
    }

    [HttpGet("by-name/{name}")]
    public async Task<ActionResult<ProfileDto>> GetProfileByName(string name)
    {
        var profile = await _profileRepository.GetByNameAsync(name);
        if (profile == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(profile));
    }

    [HttpGet("favorites")]
    public async Task<ActionResult<IEnumerable<ProfileDto>>> GetFavoriteProfiles()
    {
        var profiles = await _profileRepository.GetFavoritesAsync();
        var profileDtos = profiles.Select(MapToDto);
        return Ok(profileDtos);
    }

    [HttpPost]
    public async Task<ActionResult<ProfileDto>> CreateProfile(ProfileDto profileDto)
    {
        Console.WriteLine($"🔍 Checking for existing profile with name: '{profileDto.Name}'");
        var existingProfile = await _profileRepository.GetByNameAsync(profileDto.Name);
        if (existingProfile != null)
        {
            Console.WriteLine($"❌ Found existing profile: '{existingProfile.Name}' (ID: {existingProfile.Id})");
            return Conflict("A profile with this name already exists");
        }

        Console.WriteLine($"✅ No existing profile found, creating new profile: '{profileDto.Name}'");
        var profile = MapFromDto(profileDto);
        var createdProfile = await _profileRepository.AddAsync(profile);
        var createdDto = MapToDto(createdProfile);

        Console.WriteLine($"✅ Profile created successfully: '{createdDto.Name}' (ID: {createdDto.Id})");
        return Created($"/api/profiles/{createdDto.Id}", createdDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(string id, ProfileDto profileDto)
    {
        var existingProfile = await _profileRepository.GetByIdAsync(id);
        if (existingProfile == null)
        {
            return NotFound();
        }

        // Check if name conflict with other profiles
        var nameConflict = await _profileRepository.GetByNameAsync(profileDto.Name);
        if (nameConflict != null && nameConflict.Id != id)
        {
            return Conflict("A profile with this name already exists");
        }

        var profile = MapFromDto(profileDto);
        profile.Id = id; // Ensure ID is preserved
        await _profileRepository.UpdateAsync(profile);

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProfile(string id)
    {
        var profile = await _profileRepository.GetByIdAsync(id);
        if (profile == null)
        {
            return NotFound();
        }

        var result = await _profileRepository.DeleteAsync(id);
        if (!result)
        {
            return StatusCode(500, "Failed to delete profile");
        }

        return NoContent();
    }

    private static ProfileDto MapToDto(Profile profile)
    {
        return new ProfileDto
        {
            Id = profile.Id,
            Name = profile.Name,
            Description = profile.Description,
            Commands = profile.Commands.Select(MapCommandToDto).ToList(),
            CreatedAt = profile.CreatedAt,
            UpdatedAt = profile.UpdatedAt,
            IsFavorite = profile.IsFavorite
        };
    }

    private static Profile MapFromDto(ProfileDto dto)
    {
        return new Profile
        {
            Id = dto.Id,
            Name = dto.Name,
            Description = dto.Description,
            Commands = dto.Commands.Select(MapCommandFromDto).ToList(),
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            IsFavorite = dto.IsFavorite
        };
    }

    private static CommandDto MapCommandToDto(Command command)
    {
        return new CommandDto
        {
            Id = command.Id,
            Name = command.Name,
            Executable = command.Executable,
            Arguments = command.Arguments,
            WorkingDirectory = command.WorkingDirectory,
            Shell = command.Shell,
            EnvironmentVariables = new Dictionary<string, string>(command.EnvironmentVariables),
            IterationEnabled = command.IterationEnabled,
            RequireConfirmation = command.RequireConfirmation,
            CreatedAt = command.CreatedAt,
            UpdatedAt = command.UpdatedAt
        };
    }

    private static Command MapCommandFromDto(CommandDto dto)
    {
        return new Command
        {
            Id = dto.Id,
            Name = dto.Name,
            Executable = dto.Executable,
            Arguments = dto.Arguments,
            WorkingDirectory = dto.WorkingDirectory,
            Shell = dto.Shell,
            EnvironmentVariables = new Dictionary<string, string>(dto.EnvironmentVariables),
            IterationEnabled = dto.IterationEnabled,
            RequireConfirmation = dto.RequireConfirmation,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt
        };
    }
}
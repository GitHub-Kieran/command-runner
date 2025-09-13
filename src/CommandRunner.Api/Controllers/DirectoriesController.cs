using Microsoft.AspNetCore.Mvc;
using CommandRunner.Data.Repositories;
using CommandRunner.Data.Models;
using CommandRunner.Api.DTOs;

namespace CommandRunner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DirectoriesController : ControllerBase
{
    private readonly IFavoriteDirectoryRepository _directoryRepository;

    public DirectoriesController(IFavoriteDirectoryRepository directoryRepository)
    {
        _directoryRepository = directoryRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FavoriteDirectoryDto>>> GetAllDirectories()
    {
        var directories = await _directoryRepository.GetAllAsync();
        var directoryDtos = directories.Select(MapToDto);
        return Ok(directoryDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FavoriteDirectoryDto>> GetDirectory(string id)
    {
        var directory = await _directoryRepository.GetByIdAsync(id);
        if (directory == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(directory));
    }

    [HttpGet("by-path")]
    public async Task<ActionResult<FavoriteDirectoryDto>> GetDirectoryByPath([FromQuery] string path)
    {
        var directory = await _directoryRepository.GetByPathAsync(path);
        if (directory == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(directory));
    }

    [HttpGet("most-used")]
    public async Task<ActionResult<IEnumerable<FavoriteDirectoryDto>>> GetMostUsedDirectories([FromQuery] int count = 10)
    {
        var directories = await _directoryRepository.GetMostUsedAsync(count);
        var directoryDtos = directories.Select(MapToDto);
        return Ok(directoryDtos);
    }

    [HttpPost]
    public async Task<ActionResult<FavoriteDirectoryDto>> CreateDirectory(FavoriteDirectoryDto directoryDto)
    {
        // Check if directory path already exists
        var existingDirectory = await _directoryRepository.GetByPathAsync(directoryDto.Path);
        if (existingDirectory != null)
        {
            return Conflict("A directory with this path already exists");
        }

        var directory = MapFromDto(directoryDto);
        var createdDirectory = await _directoryRepository.AddAsync(directory);
        var createdDto = MapToDto(createdDirectory);

        return Created($"/api/directories/{createdDto.Id}", createdDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDirectory(string id, FavoriteDirectoryDto directoryDto)
    {
        var existingDirectory = await _directoryRepository.GetByIdAsync(id);
        if (existingDirectory == null)
        {
            return NotFound();
        }

        // Check if path conflict with other directories
        var pathConflict = await _directoryRepository.GetByPathAsync(directoryDto.Path);
        if (pathConflict != null && pathConflict.Id != id)
        {
            return Conflict("A directory with this path already exists");
        }

        var directory = MapFromDto(directoryDto);
        directory.Id = id; // Ensure ID is preserved
        await _directoryRepository.UpdateAsync(directory);

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDirectory(string id)
    {
        var directory = await _directoryRepository.GetByIdAsync(id);
        if (directory == null)
        {
            return NotFound();
        }

        var result = await _directoryRepository.DeleteAsync(id);
        if (!result)
        {
            return StatusCode(500, "Failed to delete directory");
        }

        return NoContent();
    }

    [HttpPost("{id}/increment-usage")]
    public async Task<IActionResult> IncrementUsage(string id)
    {
        var directory = await _directoryRepository.GetByIdAsync(id);
        if (directory == null)
        {
            return NotFound();
        }

        await _directoryRepository.IncrementUsageAsync(id);
        return NoContent();
    }

    private static FavoriteDirectoryDto MapToDto(FavoriteDirectory directory)
    {
        return new FavoriteDirectoryDto
        {
            Id = directory.Id,
            Path = directory.Path,
            Name = directory.Name,
            CreatedAt = directory.CreatedAt,
            UsageCount = directory.UsageCount
        };
    }

    private static FavoriteDirectory MapFromDto(FavoriteDirectoryDto dto)
    {
        return new FavoriteDirectory
        {
            Id = dto.Id,
            Path = dto.Path,
            Name = dto.Name,
            CreatedAt = dto.CreatedAt,
            UsageCount = dto.UsageCount
        };
    }
}

public class FavoriteDirectoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int UsageCount { get; set; } = 0;
}
namespace CommandRunner.Api.Features.Directories;

public class FavoriteDirectoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int UsageCount { get; set; } = 0;
}

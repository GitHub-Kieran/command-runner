namespace CommandRunner.Data.Models;

public class FavoriteDirectory
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Path { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty; // Display name
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int UsageCount { get; set; } = 0; // Track how often it's used
}
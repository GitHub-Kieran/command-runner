using CommandRunner.Data.Models;

namespace CommandRunner.Data.Repositories;

public class FavoriteDirectoryRepository : BaseJsonRepository<FavoriteDirectory>, IFavoriteDirectoryRepository
{
    public FavoriteDirectoryRepository() : base("favoriteDirectories.json") { }

    public override async Task<IEnumerable<FavoriteDirectory>> GetAllAsync()
    {
        return await base.GetAllAsync();
    }

    public override async Task<FavoriteDirectory?> GetByIdAsync(string id)
    {
        return await base.GetByIdAsync(id);
    }

    public async Task<FavoriteDirectory?> GetByPathAsync(string path)
    {
        var directories = await GetAllAsync();
        return directories.FirstOrDefault(d => d.Path.Equals(path, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<FavoriteDirectory> AddAsync(FavoriteDirectory directory)
    {
        await AddOrUpdateAsync(directory);
        return directory;
    }

    public async Task<FavoriteDirectory> UpdateAsync(FavoriteDirectory directory)
    {
        await AddOrUpdateAsync(directory);
        return directory;
    }

    public override async Task<bool> DeleteAsync(string id)
    {
        return await base.DeleteAsync(id);
    }

    public async Task<IEnumerable<FavoriteDirectory>> GetMostUsedAsync(int count = 10)
    {
        var directories = await GetAllAsync();
        return directories
            .OrderByDescending(d => d.UsageCount)
            .ThenBy(d => d.CreatedAt)
            .Take(count);
    }

    public async Task IncrementUsageAsync(string id)
    {
        var directory = await GetByIdAsync(id);
        if (directory != null)
        {
            directory.UsageCount++;
            await AddOrUpdateAsync(directory);
        }
    }

    protected override string GetId(FavoriteDirectory item)
    {
        return item.Id;
    }
}
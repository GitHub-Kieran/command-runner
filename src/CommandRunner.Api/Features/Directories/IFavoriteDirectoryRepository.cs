namespace CommandRunner.Api.Features.Directories;

public interface IFavoriteDirectoryRepository
{
    Task<IEnumerable<FavoriteDirectory>> GetAllAsync();
    Task<FavoriteDirectory?> GetByIdAsync(string id);
    Task<FavoriteDirectory?> GetByPathAsync(string path);
    Task<FavoriteDirectory> AddAsync(FavoriteDirectory directory);
    Task<FavoriteDirectory> UpdateAsync(FavoriteDirectory directory);
    Task<bool> DeleteAsync(string id);
    Task<IEnumerable<FavoriteDirectory>> GetMostUsedAsync(int count = 10);
    Task IncrementUsageAsync(string id);
}

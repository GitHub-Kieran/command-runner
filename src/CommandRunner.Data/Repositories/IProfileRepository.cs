using CommandRunner.Data.Models;

namespace CommandRunner.Data.Repositories;

public interface IProfileRepository
{
    Task<IEnumerable<Profile>> GetAllAsync();
    Task<Profile?> GetByIdAsync(string id);
    Task<Profile?> GetByNameAsync(string name);
    Task<Profile> AddAsync(Profile profile);
    Task<Profile> UpdateAsync(Profile profile);
    Task<bool> DeleteAsync(string id);
    Task<IEnumerable<Profile>> GetFavoritesAsync();
    Task<bool> ExistsAsync(string name);
}
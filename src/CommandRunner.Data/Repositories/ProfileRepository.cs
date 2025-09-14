using CommandRunner.Data.Models;

namespace CommandRunner.Data.Repositories;

public class ProfileRepository : BaseJsonRepository<Profile>, IProfileRepository
{
    public ProfileRepository() : base("profiles.json") { }

    public override async Task<IEnumerable<Profile>> GetAllAsync()
    {
        return await base.GetAllAsync();
    }

    public override async Task<Profile?> GetByIdAsync(string id)
    {
        return await base.GetByIdAsync(id);
    }

    public async Task<Profile?> GetByNameAsync(string name)
    {
        var profiles = await GetAllAsync();
        return profiles.FirstOrDefault(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<Profile> AddAsync(Profile profile)
    {
        profile.UpdatedAt = DateTime.UtcNow;
        await AddOrUpdateAsync(profile);
        return profile;
    }

    public async Task<Profile> UpdateAsync(Profile profile)
    {
        profile.UpdatedAt = DateTime.UtcNow;
        await AddOrUpdateAsync(profile);
        return profile;
    }

    public override async Task<bool> DeleteAsync(string id)
    {
        return await base.DeleteAsync(id);
    }

    public async Task<IEnumerable<Profile>> GetFavoritesAsync()
    {
        var profiles = await GetAllAsync();
        return profiles.Where(p => p.IsFavorite);
    }

    public async Task<bool> ExistsAsync(string name)
    {
        var profile = await GetByNameAsync(name);
        return profile != null;
    }

    protected override string GetId(Profile item)
    {
        return item.Id;
    }
}
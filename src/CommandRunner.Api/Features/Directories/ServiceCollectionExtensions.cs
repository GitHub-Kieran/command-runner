using Microsoft.Extensions.DependencyInjection;

namespace CommandRunner.Api.Features.Directories;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDirectoriesFeature(this IServiceCollection services)
    {
        services.AddScoped<IFavoriteDirectoryRepository, FavoriteDirectoryRepository>();

        return services;
    }
}

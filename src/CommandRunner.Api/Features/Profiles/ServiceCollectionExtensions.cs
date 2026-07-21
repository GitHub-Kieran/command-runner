using Microsoft.Extensions.DependencyInjection;

namespace CommandRunner.Api.Features.Profiles;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddProfilesFeature(this IServiceCollection services)
    {
        services.AddScoped<IProfileRepository, ProfileRepository>();

        return services;
    }
}

using CommandRunner.Api.Features.Commands;
using CommandRunner.Api.Features.Directories;
using CommandRunner.Api.Features.Profiles;
using Microsoft.Extensions.DependencyInjection;

namespace CommandRunner.Api;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCommandRunnerServices(this IServiceCollection services)
    {
        services.AddProfilesFeature();
        services.AddDirectoriesFeature();
        services.AddCommandsFeature();

        return services;
    }
}

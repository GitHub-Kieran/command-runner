using CommandRunner.Business.Services;
using CommandRunner.Data.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace CommandRunner.Business;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCommandRunnerServices(this IServiceCollection services)
    {
        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IFavoriteDirectoryRepository, FavoriteDirectoryRepository>();
        services.AddScoped<ICommandValidationService, CommandValidationService>();
        services.AddScoped<ICommandExecutionService, CommandExecutionService>();
        services.AddScoped<IIterationService, IterationService>();
        services.AddScoped<ISecurityService, SecurityService>();

        return services;
    }
}

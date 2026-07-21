using Microsoft.Extensions.DependencyInjection;

namespace CommandRunner.Api.Features.Commands;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCommandsFeature(this IServiceCollection services)
    {
        services.AddScoped<ICommandValidationService, CommandValidationService>();
        services.AddScoped<ICommandExecutionService, CommandExecutionService>();
        services.AddScoped<IIterationService, IterationService>();
        services.AddScoped<ISecurityService, SecurityService>();

        return services;
    }
}

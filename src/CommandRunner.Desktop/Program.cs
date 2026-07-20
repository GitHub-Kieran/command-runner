using System.Drawing;
using CommandRunner.Business;
using Photino.NET;

namespace CommandRunner.Desktop;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Referencing CommandRunner.Api for its controllers also copies its appsettings.json
        // into this app's output, whose fixed Kestrel:Endpoints entry would otherwise win over
        // UseUrls below (config-based endpoints always take precedence in Kestrel). Registering
        // our own value for the same key, after the file-based config sources, overrides it.
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Kestrel:Endpoints:Http:Url"] = "http://127.0.0.1:0",
        });

        builder.Services.AddControllers()
            .AddApplicationPart(typeof(CommandRunner.Api.Controllers.ProfilesController).Assembly)
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
            });
        builder.Services.AddCommandRunnerServices();

        // Port 0 => the OS assigns any free port. No fixed port to guess or collide with.
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        var app = builder.Build();
        app.UseDefaultFiles();
        app.UseStaticFiles();
        app.MapControllers();
        app.Start();

        var baseUrl = app.Urls.First();
        Console.WriteLine($"Command Runner API listening on {baseUrl}");

#if DEBUG
        // Vite's own dev server, for hot reload while iterating on the UI.
        var appUrl = "http://localhost:5174";
#else
        var appUrl = baseUrl;
#endif

        var window = new PhotinoWindow()
            .SetTitle("Command Runner")
            .SetUseOsDefaultSize(false)
            .SetSize(new Size(1280, 860))
            .Center()
            .SetResizable(true)
            .Load(appUrl);

        window.WaitForClose();

        app.StopAsync().GetAwaiter().GetResult();
    }
}

using System.Diagnostics;
using System.Drawing;
using CommandRunner.Api;
using Photino.NET;

namespace CommandRunner.Desktop;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        if (OperatingSystem.IsLinux() && Environment.GetEnvironmentVariable("WEBKIT_DISABLE_DMABUF_RENDERER") is null)
        {
            // WebKitGTK's DMA-BUF renderer often fails to composite anything under virtualized/
            // software-rendered GPUs (e.g. VirtualBox), producing a blank white window with no
            // error. Forcing the legacy compositor sidesteps that; harmless on real hardware.
            // WebKitGTK reads this from the process's environment at exec() time, well before any
            // of our code runs -- Environment.SetEnvironmentVariable() here is too late to affect
            // it (proven empirically: it does not fix the blank window), so we set it and
            // re-exec ourselves as a child process instead.
            var processPath = Environment.ProcessPath ?? "CommandRunner.Desktop";
            var isDotnetHost = Path.GetFileNameWithoutExtension(processPath).Equals("dotnet", StringComparison.OrdinalIgnoreCase);

            var psi = new ProcessStartInfo(processPath)
            {
                UseShellExecute = false,
            };
            if (isDotnetHost)
            {
                // `dotnet run`/framework-dependent launch: process is the dotnet muxer, so the
                // entry assembly's DLL has to be passed as its first argument.
                psi.ArgumentList.Add(System.Reflection.Assembly.GetEntryAssembly()!.Location);
            }
            foreach (var arg in args)
            {
                psi.ArgumentList.Add(arg);
            }
            psi.Environment["WEBKIT_DISABLE_DMABUF_RENDERER"] = "1";

            using var child = Process.Start(psi);
            child!.WaitForExit();
            Environment.Exit(child.ExitCode);
        }

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
            .AddApplicationPart(typeof(CommandRunner.Api.Features.Profiles.ProfilesController).Assembly)
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

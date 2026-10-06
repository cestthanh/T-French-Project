using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TFrench.API.Tests;

public sealed class ApiFactory(TimeProvider? clock = null) : WebApplicationFactory<Program>
{
    private readonly string databasePath = Path.Combine(
        Path.GetTempPath(), $"tfrench-tests-{Guid.NewGuid():N}.db");
    private readonly string storagePath = Path.Combine(
        Path.GetTempPath(), $"tfrench-test-uploads-{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        if (clock != null) builder.ConfigureServices(services => services.AddSingleton(clock));
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={databasePath}",
                ["FileStorage:RootPath"] = storagePath,
                ["DemoData:Enabled"] = "true",
                ["Quiz:DeadlineSweepSeconds"] = "1",
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;
        try { File.Delete(databasePath); }
        catch (IOException) { /* SQLite can release the file shortly after host disposal. */ }
        var fullStoragePath = Path.GetFullPath(storagePath);
        var tempRoot = Path.GetFullPath(Path.GetTempPath());
        if (fullStoragePath.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase) &&
            Directory.Exists(fullStoragePath))
            Directory.Delete(fullStoragePath, recursive: true);
    }
}

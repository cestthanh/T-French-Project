using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;
using TFrench.API.Data;
using TFrench.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ─── Database ────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── JWT Authentication ──────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("Jwt:Key must be provided through production secrets.");

    // A known key is acceptable only for local development. Production fails
    // fast above instead of silently starting with a key committed to source.
    jwtKey = "TFrench_Local_Development_Key_Not_For_Production_2026!";
}

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes.");

// AuthService reads the same configuration value when issuing tokens. Publish
// the development fallback into the in-memory configuration so validation and
// issuance cannot accidentally use different keys.
builder.Configuration["Jwt:Key"] = jwtKey;

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is required.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is required.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // Role/lock changes must take effect immediately rather than waiting for
        // a 24-hour JWT to expire. The database check is a deliberate trade-off
        // for this small deployment; it can be replaced by a security-stamp
        // cache when traffic warrants it.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var idValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var role = context.Principal?.FindFirstValue(ClaimTypes.Role);
                if (!int.TryParse(idValue, out var userId))
                {
                    context.Fail("Invalid user claim.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var user = await db.Users.AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsActive, u.Role })
                    .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

                if (user == null || !user.IsActive || user.Role.ToString() != role)
                    context.Fail("This session is no longer valid.");
            }
        };
    });

builder.Services.AddAuthorization();

if (!builder.Environment.IsDevelopment())
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        // Railway is the only public entry point to the container, but its
        // internal proxy addresses are dynamic and cannot be enumerated here.
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

// Public/auth endpoints need explicit abuse controls. Limits are deliberately
// conservative for a small centre and can later move to distributed storage
// if the API runs on more than one instance.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true,
        }));

    options.AddPolicy("public-leads", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0,
            AutoReplenishment = true,
        }));

    options.AddPolicy("uploads", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true,
        }));
});

// ─── CORS (allow Angular dev server) ────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials();

        if (builder.Environment.IsDevelopment())
        {
            // `ng serve` picks a random port whenever 4200 is already taken, and a
            // hard-coded origin then silently fails the preflight. In development,
            // trust any loopback origin instead.
            policy.SetIsOriginAllowed(origin =>
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback);
        }
        else
        {
            var origins = builder.Configuration["Cors:AllowedOrigins"]?
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                ?? [];
            // The production container serves Angular and the API from the same
            // origin, so CORS is not needed by default. Configure this setting
            // only when a separate frontend is intentionally introduced.
            if (origins.Length > 0)
                policy.WithOrigins(origins);
        }
    });
});

// ─── File storage ────────────────────────────────────────────────────────────
// Only RootPath and MaxSizeBytes are configurable. The extension whitelist
// stays in FileStorageOptions: it is a security boundary, and IConfiguration
// binding merges into a dictionary rather than replacing it, so a typo in
// appsettings would silently widen the list instead of narrowing it.
builder.Services.Configure<FileStorageOptions>(builder.Configuration.GetSection("FileStorage"));
builder.Services.AddScoped<FileStorageService>();

// Kestrel's default multipart cap is 128 MB; bring it down near our own limit
// so an oversized upload is rejected before it is buffered to disk.
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 30 * 1024 * 1024;
});

// ─── Services ────────────────────────────────────────────────────────────────
builder.Services.AddScoped<AuthService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<QuizAttemptService>();
builder.Services.AddHostedService<QuizDeadlineWorker>();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));

// ─── Build ────────────────────────────────────────────────────────────────────
var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    // Respect Railway/other reverse-proxy HTTPS headers before deciding whether
    // to redirect. ASPNETCORE_FORWARDEDHEADERS_ENABLED enables known-proxy
    // handling in the platform configuration.
    app.UseForwardedHeaders();
}

// Never expose framework/database stack traces to an API caller. The handler
// logs the full exception with a trace id and returns a stable Problem Details
// payload in every environment.
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// Apply migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    if (app.Environment.IsDevelopment() &&
        builder.Configuration.GetValue("DemoData:Enabled", true))
    {
        await TFrench.API.Services.DataSeeder.SeedAsync(db);
    }
    else if (!app.Environment.IsDevelopment())
    {
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("ProductionBootstrap");
        await ProductionBootstrapper.EnsureAdminAsync(db, builder.Configuration, logger);
    }
}

app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
{
    var canConnect = await db.Database.CanConnectAsync(cancellationToken);
    return canConnect
        ? Results.Ok(new { status = "healthy" })
        : Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
});
app.MapControllers();

if (!app.Environment.IsDevelopment())
{
    // Let Angular handle client-side routes while preserving a real 404 for
    // unknown API paths instead of returning index.html as if it were JSON.
    app.MapFallback(async context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
        if (!File.Exists(indexPath))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(indexPath);
    });
}

app.Run();

// Exposes the top-level entry point to WebApplicationFactory integration tests.
public partial class Program { }

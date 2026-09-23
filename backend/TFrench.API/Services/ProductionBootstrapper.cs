using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Services;

public static class ProductionBootstrapper
{
    public static async Task EnsureAdminAsync(
        AppDbContext db,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(user => user.Role == UserRole.Admin, cancellationToken))
            return;

        var email = configuration["BootstrapAdmin:Email"]?.Trim().ToLowerInvariant();
        var password = configuration["BootstrapAdmin:Password"];
        var fullName = configuration["BootstrapAdmin:FullName"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "No administrator exists. Set BootstrapAdmin:Email and BootstrapAdmin:Password for the first production deployment.");
        }

        if (!new EmailAddressAttribute().IsValid(email))
            throw new InvalidOperationException("BootstrapAdmin:Email is not a valid email address.");

        if (password.Length < 12)
            throw new InvalidOperationException("BootstrapAdmin:Password must contain at least 12 characters.");

        fullName = string.IsNullOrWhiteSpace(fullName) ? "Quản trị viên" : fullName;
        if (fullName.Length is < 2 or > 100)
            throw new InvalidOperationException("BootstrapAdmin:FullName must contain between 2 and 100 characters.");

        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            throw new InvalidOperationException(
                "BootstrapAdmin:Email already belongs to a non-admin account. Choose another email; the application will not promote accounts automatically.");
        }

        db.Users.Add(new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Created the initial production administrator {AdminEmail}.", email);
    }
}

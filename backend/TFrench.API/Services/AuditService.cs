using System.Security.Claims;
using System.Text.Json;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Services;

public class AuditService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
{
    public void Record(string action, string entityType, object? entityId = null, object? metadata = null)
    {
        var context = httpContextAccessor.HttpContext;
        var actorValue = context?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = int.TryParse(actorValue, out var actorId) ? actorId : null,
            Action = action,
            EntityType = entityType,
            EntityId = entityId?.ToString(),
            MetadataJson = metadata == null ? null : JsonSerializer.Serialize(metadata),
            IpAddress = context?.Connection.RemoteIpAddress?.ToString(),
        });
    }
}

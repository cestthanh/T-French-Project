using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public class AuditLog
{
    public long Id { get; set; }
    public int? ActorUserId { get; set; }
    public User? ActorUser { get; set; }
    [Required, MaxLength(100)] public string Action { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string EntityType { get; set; } = string.Empty;
    [MaxLength(100)] public string? EntityId { get; set; }
    public string? MetadataJson { get; set; }
    [MaxLength(64)] public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

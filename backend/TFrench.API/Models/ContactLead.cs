using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

/// <summary>Where a lead has got to in the centre's follow-up.</summary>
public enum LeadStatus
{
    New,
    Contacted,
    Enrolled,
    /// <summary>Not going ahead — wrong fit, no answer, chose elsewhere.</summary>
    Closed,
}

/// <summary>
/// Somebody who asked for advice through the public site but has no account yet.
///
/// context.txt lists managing study-abroad enquiries alongside students, but
/// the landing page's contact form had nowhere to send them: it set a
/// "sent!" flag locally and dropped the message.
/// </summary>
public class ContactLead
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? PhoneNumber { get; set; }

    [Required, MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    /// <summary>What they are after — a course level, "du học", and so on.
    /// Free text, because the enquiry form should not make someone classify
    /// themselves before they have spoken to anyone.</summary>
    [MaxLength(100)]
    public string? Interest { get; set; }

    public LeadStatus Status { get; set; } = LeadStatus.New;

    /// <summary>Internal follow-up notes. Never shown to the person who wrote
    /// in — the whole entity is admin-only.</summary>
    public string? Note { get; set; }

    /// <summary>Admin who last moved the lead along.</summary>
    public int? HandledById { get; set; }
    public User? HandledBy { get; set; }

    public DateTime? HandledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

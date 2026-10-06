using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public enum AssignmentStatus { Draft, Published, Closed }

public class Assignment
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>External link to the brief. See <see cref="AttachmentId"/> for
    /// the uploaded alternative.</summary>
    public string? AttachmentUrl { get; set; }

    /// <summary>Uploaded brief held in the centre's own storage.</summary>
    public int? AttachmentId { get; set; }
    public StoredFile? Attachment { get; set; }

    public DateTime DueDate { get; set; }
    public DateTime? OpenAt { get; set; }
    // Null is retained only for historical assignments that had no hard cutoff.
    public DateTime? CutoffAt { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    // Null keeps existing assignments available to every active class in the
    // course. New teacher-facing forms choose one concrete class.
    public int? ClassId { get; set; }
    public CourseClass? Class { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Submission> Submissions { get; set; } = [];
}

public class Submission
{
    [Key]
    public int Id { get; set; }

    public int AssignmentId { get; set; }
    public Assignment? Assignment { get; set; }

    public int StudentId { get; set; }
    public User? Student { get; set; }
    public int AttemptNumber { get; set; } = 1;
    public bool IsLate { get; set; }
    public DateTime? ReleasedAt { get; set; }

    /// <summary>External link the student pasted instead of uploading.</summary>
    public string? FileUrl { get; set; }

    /// <summary>The uploaded submission. Readable only by its author, the
    /// teacher of the course, and admins.</summary>
    public int? FileId { get; set; }
    public StoredFile? File { get; set; }

    public string? Note { get; set; }

    public int? Grade { get; set; }          // 0-10
    public string? Feedback { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? GradedAt { get; set; }
}

public class AssignmentResubmissionGrant
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public Assignment Assignment { get; set; } = null!;
    public int StudentId { get; set; }
    public User Student { get; set; } = null!;
    public int AttemptNumber { get; set; }
    public DateTime CutoffAt { get; set; }
    [Required, MaxLength(1000)] public string Reason { get; set; } = "";
    public int GrantedById { get; set; }
    public User GrantedBy { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

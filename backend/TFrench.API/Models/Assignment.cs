using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

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

    public int CourseId { get; set; }
    public Course? Course { get; set; }

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

    /// <summary>External link the student pasted instead of uploading.</summary>
    public string? FileUrl { get; set; }

    /// <summary>The uploaded submission. Readable only by its author, the
    /// teacher of the course, and admins.</summary>
    public int? FileId { get; set; }
    public StoredFile? File { get; set; }

    public string? Note { get; set; }

    public int? Grade { get; set; }          // 0-100
    public string? Feedback { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? GradedAt { get; set; }
}

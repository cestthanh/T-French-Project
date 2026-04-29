using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public class Assignment
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? AttachmentUrl { get; set; }
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

    public string? FileUrl { get; set; }
    public string? Note { get; set; }

    public int? Grade { get; set; }          // 0-100
    public string? Feedback { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? GradedAt { get; set; }
}

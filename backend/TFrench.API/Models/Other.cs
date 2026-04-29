using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public class Resource
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public string? Category { get; set; }
    public bool IsPublic { get; set; } = false;

    public int? CourseId { get; set; }   // nullable — resource may not belong to a course
    public Course? Course { get; set; }

    public int UploadedById { get; set; }
    public User? UploadedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


public class Enrollment
{
    [Key]
    public int Id { get; set; }

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    public int StudentId { get; set; }
    public User? Student { get; set; }

    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

public class BookingSlot
{
    [Key]
    public int Id { get; set; }

    public int TeacherId { get; set; }
    public User? Teacher { get; set; }

    public int? StudentId { get; set; }
    public User? Student { get; set; }

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsBooked { get; set; } = false;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class BlogPost
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Slug { get; set; } = string.Empty; // SEO URL

    public string? Summary { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? Tags { get; set; }

    public int AuthorId { get; set; }
    public User? Author { get; set; }

    public bool IsPublished { get; set; } = false;
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public class Resource
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>External link (Google Drive, YouTube…). Kept alongside
    /// <see cref="FileId"/> for material that is too large to host or already
    /// lives elsewhere. Exactly one of the two is set.</summary>
    public string? FileUrl { get; set; }

    public string? FileType { get; set; }

    /// <summary>Uploaded copy held in the centre's own storage. Access is
    /// checked on download, so this is the option that keeps material private.</summary>
    public int? FileId { get; set; }
    public StoredFile? File { get; set; }

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

    /// <summary>The concrete cohort. Nullable only while legacy course-level
    /// enrolments are backfilled by the migration/seed process.</summary>
    public int? ClassId { get; set; }
    public CourseClass? Class { get; set; }

    public int StudentId { get; set; }
    public User? Student { get; set; }

    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;

    // Kept during the compatibility migration because the existing LMS queries
    // use it. All new enrollment workflows update Status and IsActive together.
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

    /// <summary>Last content edit. Null until the post is first edited, so the
    /// admin list can tell "never touched since writing" from "revised".
    /// Publishing and unpublishing do not count — that is what PublishedAt is
    /// for, and treating it as an edit would make the column meaningless.</summary>
    public DateTime? UpdatedAt { get; set; }
}

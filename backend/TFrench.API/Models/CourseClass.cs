using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public enum ClassModality { Online, Offline, Hybrid }

public enum ClassStatus { Draft, Open, InProgress, Completed, Cancelled }

/// <summary>
/// A scheduled cohort of a course. Course describes what is taught; this
/// entity describes who teaches one concrete run, when it happens and how many
/// students it can accept.
/// </summary>
public class CourseClass
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    public int TeacherId { get; set; }
    public User? Teacher { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public int Capacity { get; set; } = 20;
    public ClassModality Modality { get; set; } = ClassModality.Online;
    public ClassStatus Status { get; set; } = ClassStatus.Draft;

    [MaxLength(300)]
    public string? ScheduleSummary { get; set; }

    [MaxLength(300)]
    public string? LocationOrMeetingUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Enrollment> Enrollments { get; set; } = [];
}

public enum EnrollmentStatus
{
    Active,
    Pending,
    Paused,
    Completed,
    Cancelled,
    Expired,
}

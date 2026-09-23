using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public class Course
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? Level { get; set; } // A1, A2, B1, B2...
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public bool IsPublished { get; set; } = false;

    public int TeacherId { get; set; }
    public User? Teacher { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<CourseClass> Classes { get; set; } = [];
    public ICollection<Assignment> Assignments { get; set; } = [];
    public ICollection<Resource> Resources { get; set; } = [];
    public ICollection<BookingSlot> BookingSlots { get; set; } = [];
}

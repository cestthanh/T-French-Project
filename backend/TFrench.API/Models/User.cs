using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public enum UserRole { Admin, Teacher, Student }

public class User
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Student;

    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Submission> Submissions { get; set; } = [];
    public ICollection<BookingSlot> BookedSlots { get; set; } = [];
}

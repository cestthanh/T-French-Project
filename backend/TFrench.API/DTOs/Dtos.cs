namespace TFrench.API.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterDto(string FullName, string Email, string Password, string? PhoneNumber);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(string Token, UserDto User);

// ── User ─────────────────────────────────────────────────────────────────────
public record UserDto(int Id, string FullName, string Email, string Role, string? AvatarUrl);

// ── Assignment ────────────────────────────────────────────────────────────────
public record CreateAssignmentDto(string Title, string? Description, DateTime DueDate, int CourseId);

public record GradeSubmissionDto(int Grade, string? Feedback);

// ── Booking ───────────────────────────────────────────────────────────────────
public record CreateSlotDto(DateTime StartTime, DateTime EndTime, int CourseId);

// ── Blog ──────────────────────────────────────────────────────────────────────
public record CreateBlogPostDto(string Title, string Slug, string? Summary, string Content, string? Tags, string? CoverImageUrl);

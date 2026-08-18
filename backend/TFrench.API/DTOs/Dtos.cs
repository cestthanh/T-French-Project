namespace TFrench.API.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterDto(string FullName, string Email, string Password, string? PhoneNumber);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(string Token, UserDto User);

// ── User ─────────────────────────────────────────────────────────────────────
public record UserDto(int Id, string FullName, string Email, string Role, string? AvatarUrl);

// ── Assignment ────────────────────────────────────────────────────────────────
// AttachmentUrl and AttachmentId are alternatives: a link out, or a file the
// centre hosts itself. Both optional — an assignment may have no brief at all.
public record CreateAssignmentDto(
    string Title, string? Description, DateTime DueDate, int CourseId,
    string? AttachmentUrl = null, int? AttachmentId = null);

public record SubmitAssignmentDto(int? FileId, string? FileUrl, string? Note);

public record GradeSubmissionDto(int Grade, string? Feedback);

// ── Booking ───────────────────────────────────────────────────────────────────
public record CreateSlotDto(DateTime StartTime, DateTime EndTime, int CourseId);

// ── Blog ──────────────────────────────────────────────────────────────────────
public record CreateBlogPostDto(string Title, string Slug, string? Summary, string Content, string? Tags, string? CoverImageUrl);

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.DTOs;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController(AppDbContext db, FileStorageService storage,
    LearningAccessService access) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;
    private bool CanGrade => CurrentRole is "Admin" or "Teacher";

    // ── GET all assignments (filtered by course/role) ─────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? courseId)
    {
        IQueryable<Assignment> query = access.VisibleAssignments(CurrentUserId, CurrentRole)
            .Include(a => a.Course)
            .Include(a => a.Attachment);

        if (courseId.HasValue)
            query = query.Where(a => a.CourseId == courseId.Value);

        var result = await query.OrderByDescending(a => a.DueDate).Select(a => new {
            a.Id, a.Title, a.Description, a.DueDate, a.AttachmentUrl,
            Attachment = a.Attachment == null ? null : new {
                a.Attachment.PublicId, a.Attachment.OriginalName,
                a.Attachment.ContentType, a.Attachment.SizeBytes
            },
            Course = a.Course!.Title, a.CourseId, a.ClassId, a.CreatedAt,
            ClassName = a.Class == null ? null : a.Class.Name,
            SubmissionCount = a.Submissions.Count
        }).ToListAsync();

        return Ok(result);
    }

    // ── GET single assignment by id ───────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var a = await db.Assignments
            .Include(x => x.Course)
            .Include(x => x.Class)
            .Include(x => x.Attachment)
            .Include(x => x.Submissions).ThenInclude(s => s.Student)
            .Include(x => x.Submissions).ThenInclude(s => s.File)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();

        if (!await access.CanSeeAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();

        // A student sees only their own submission. Returning the whole list
        // would show one student another student's mark and feedback.
        var visible = CanGrade
            ? a.Submissions.ToList()
            : a.Submissions.Where(s => s.StudentId == CurrentUserId).ToList();

        return Ok(new
        {
            a.Id, a.Title, a.Description, a.DueDate, a.CourseId, a.ClassId, a.CreatedAt,
            ClassName = a.Class == null ? null : a.Class.Name,
            a.AttachmentUrl,
            Attachment = Describe(a.Attachment),
            Course = a.Course == null ? null : new { a.Course.Id, a.Course.Title },
            Submissions = visible.Select(s => new
            {
                s.Id, s.StudentId, s.Note, s.FileUrl, s.Grade, s.Feedback,
                s.SubmittedAt, s.GradedAt,
                File = Describe(s.File),
                // Projected by hand rather than serialising the User entity —
                // that would have put PasswordHash on the wire.
                Student = s.Student == null ? null : new { s.Student.Id, s.Student.FullName }
            })
        });
    }

    // ── CREATE assignment (Teacher/Admin only) ────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tiêu đề bài tập phải có từ 1 đến 200 ký tự." });
        if (dto.DueDate <= DateTime.UtcNow)
            return BadRequest(new { message = "Hạn nộp phải ở tương lai." });
        if (dto.AttachmentId != null && !string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest(new { message = "Chỉ được chọn một file hoặc một link đính kèm." });
        if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl) && !IsHttpUrl(dto.AttachmentUrl))
            return BadRequest(new { message = "Link đính kèm phải là URL http/https hợp lệ." });

        var course = await db.Courses.FindAsync(dto.CourseId);
        if (course == null) return BadRequest(new { message = "Khoá học không tồn tại." });

        if (!await access.CanAttachToScopeAsync(dto.CourseId, dto.ClassId, CurrentUserId, CurrentRole))
            return BadRequest(new { message = "Lớp không thuộc khoá hoặc không thuộc giáo viên hiện tại." });

        if (!await OwnsFileAsync(dto.AttachmentId))
            return BadRequest(new { message = "File đính kèm không hợp lệ." });

        var assignment = new Assignment
        {
            Title = dto.Title, Description = dto.Description,
            DueDate = dto.DueDate, CourseId = dto.CourseId, ClassId = dto.ClassId,
            AttachmentUrl = string.IsNullOrWhiteSpace(dto.AttachmentUrl) ? null : dto.AttachmentUrl,
            AttachmentId = dto.AttachmentId
        };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();
        return Ok(new
        {
            assignment.Id, assignment.Title, assignment.Description,
            assignment.DueDate, assignment.CourseId, assignment.ClassId,
            assignment.AttachmentUrl, assignment.AttachmentId, assignment.CreatedAt,
        });
    }

    // ── UPDATE assignment ─────────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateAssignmentDto dto)
    {
        var a = await db.Assignments.Include(x => x.Course).Include(x => x.Attachment)
                                    .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tiêu đề bài tập phải có từ 1 đến 200 ký tự." });
        if (dto.CourseId != a.CourseId)
            return BadRequest(new { message = "Không thể chuyển bài tập sang khoá học khác sau khi tạo." });
        if (!await access.CanAttachToScopeAsync(dto.CourseId, dto.ClassId, CurrentUserId, CurrentRole))
            return BadRequest(new { message = "Lớp không thuộc khoá hoặc không thuộc giáo viên hiện tại." });
        if (dto.ClassId != a.ClassId)
            return BadRequest(new { message = "Không thể đổi phạm vi lớp của bài tập sau khi tạo." });
        if (dto.AttachmentId != null && !string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest(new { message = "Chỉ được chọn một file hoặc một link đính kèm." });
        if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl) && !IsHttpUrl(dto.AttachmentUrl))
            return BadRequest(new { message = "Link đính kèm phải là URL http/https hợp lệ." });

        a.Title = dto.Title; a.Description = dto.Description;
        a.DueDate = dto.DueDate; a.ClassId = dto.ClassId;

        // Only replace the brief when a new one is supplied — see the same rule
        // in ResourcesController.Update.
        if (dto.AttachmentId != null && dto.AttachmentId != a.AttachmentId)
        {
            if (!await OwnsFileAsync(dto.AttachmentId))
                return BadRequest(new { message = "File đính kèm không hợp lệ." });

            var previous = a.Attachment;
            a.AttachmentId = dto.AttachmentId;
            a.AttachmentUrl = null;
            await DeleteFileAsync(previous);
        }
        else if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl) && dto.AttachmentUrl != a.AttachmentUrl)
        {
            var previous = a.Attachment;
            a.AttachmentUrl = dto.AttachmentUrl;
            a.AttachmentId = null;
            await DeleteFileAsync(previous);
        }

        await db.SaveChangesAsync();
        return Ok(new
        {
            a.Id, a.Title, a.Description, a.DueDate, a.CourseId, a.ClassId,
            a.AttachmentUrl, a.AttachmentId, a.CreatedAt,
        });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await db.Assignments
            .Include(x => x.Course)
            .Include(x => x.Attachment)
            .Include(x => x.Submissions).ThenInclude(s => s.File)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();

        // Take the file rows with the assignment: once the submissions are gone
        // nothing points at those bytes, and they would sit on disk forever.
        var files = a.Submissions.Select(s => s.File).Append(a.Attachment)
                     .Where(f => f != null).Cast<StoredFile>().ToList();

        db.Assignments.Remove(a);
        await db.SaveChangesAsync();

        foreach (var f in files) storage.Delete(f);
        db.StoredFiles.RemoveRange(files);
        await db.SaveChangesAsync();

        return NoContent();
    }

    // ── SUBMIT assignment (Student only) ──────────────────────────────────────
    [HttpPost("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id, [FromBody] SubmitAssignmentDto dto)
    {
        var assignment = await db.Assignments.FindAsync(id);
        if (assignment == null) return NotFound();
        if (dto.FileId == null && string.IsNullOrWhiteSpace(dto.FileUrl) && string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new { message = "Bài nộp cần có file, link hoặc ghi chú." });
        if (dto.FileId != null && !string.IsNullOrWhiteSpace(dto.FileUrl))
            return BadRequest(new { message = "Chỉ được nộp một file hoặc một link." });
        if (!string.IsNullOrWhiteSpace(dto.FileUrl) && !IsHttpUrl(dto.FileUrl))
            return BadRequest(new { message = "Link bài làm phải là URL http/https hợp lệ." });

        // Enrolment was previously unchecked here: any student could hand work
        // in to any course's assignment just by knowing its id.
        if (!await access.CanSeeAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();

        // Check already submitted
        var existing = await db.Submissions
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == CurrentUserId);
        if (existing != null)
            return Conflict(new { message = "Bạn đã nộp bài cho bài tập này." });

        if (!await OwnsFileAsync(dto.FileId))
            return BadRequest(new { message = "File nộp bài không hợp lệ." });

        var submission = new Submission
        {
            AssignmentId = id,
            StudentId = CurrentUserId,
            Note = dto.Note,
            FileUrl = string.IsNullOrWhiteSpace(dto.FileUrl) ? null : dto.FileUrl,
            FileId = dto.FileId
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        await db.Entry(submission).Reference(s => s.File).LoadAsync();
        return Ok(new
        {
            submission.Id, submission.StudentId, submission.Note, submission.FileUrl,
            submission.Grade, submission.Feedback, submission.SubmittedAt, submission.GradedAt,
            File = Describe(submission.File)
        });
    }

    // ── GRADE submission (Teacher/Admin only) ─────────────────────────────────
    [HttpPost("{assignmentId}/submissions/{submissionId}/grade")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Grade(int assignmentId, int submissionId, [FromBody] GradeSubmissionDto dto)
    {
        if (dto.Grade is < 0 or > 10)
            return BadRequest(new { message = "Điểm phải nằm trong khoảng từ 0 đến 10." });

        var submission = await db.Submissions
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == assignmentId);
        if (submission == null) return NotFound();

        if (!await access.CanManageAssignmentAsync(assignmentId, CurrentUserId, CurrentRole))
            return Forbid();

        submission.Grade = dto.Grade;
        submission.Feedback = dto.Feedback;
        submission.GradedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { submission.Id, submission.Grade, submission.Feedback, submission.GradedAt });
    }

    // ── GET my submissions (Student) ──────────────────────────────────────────
    [HttpGet("my-submissions")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> MySubmissions()
    {
        var subs = await db.Submissions
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .Include(s => s.File)
            .Where(s => s.StudentId == CurrentUserId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new {
                s.Id, s.SubmittedAt, s.Grade, s.Feedback, s.GradedAt, s.Note, s.FileUrl,
                File = s.File == null ? null : new {
                    s.File.PublicId, s.File.OriginalName, s.File.ContentType, s.File.SizeBytes
                },
                Assignment = s.Assignment!.Title,
                Course = s.Assignment.Course!.Title,
                DueDate = s.Assignment.DueDate
            })
            .ToListAsync();
        return Ok(subs);
    }

    /// <summary>See ResourcesController.OwnsFileAsync — stops a caller
    /// attaching a file id that belongs to somebody else.</summary>
    private async Task<bool> OwnsFileAsync(int? fileId)
    {
        if (fileId == null) return true;
        return await db.StoredFiles.AnyAsync(f =>
            f.Id == fileId && (CurrentRole == "Admin" || f.UploadedById == CurrentUserId));
    }

    private async Task DeleteFileAsync(StoredFile? file)
    {
        if (file == null) return;
        storage.Delete(file);
        db.StoredFiles.Remove(file);
        await db.SaveChangesAsync();
    }

    private static object? Describe(StoredFile? f) => f == null ? null : new
    {
        f.PublicId, f.OriginalName, f.ContentType, f.SizeBytes
    };

    private static bool IsHttpUrl(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

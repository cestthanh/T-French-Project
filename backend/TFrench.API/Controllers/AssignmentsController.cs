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
public class AssignmentsController(AppDbContext db, FileStorageService storage) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;
    private bool CanGrade => CurrentRole is "Admin" or "Teacher";

    // ── GET all assignments (filtered by course/role) ─────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? courseId)
    {
        var query = db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Attachment)
            .AsQueryable();

        if (courseId.HasValue)
            query = query.Where(a => a.CourseId == courseId.Value);

        // Students only see assignments for courses they're enrolled in
        if (CurrentRole == "Student")
        {
            var enrolledCourseIds = await db.Enrollments
                .Where(e => e.StudentId == CurrentUserId && e.IsActive)
                .Select(e => e.CourseId)
                .ToListAsync();
            query = query.Where(a => enrolledCourseIds.Contains(a.CourseId));
        }
        // Teachers only see assignments for courses they teach
        else if (CurrentRole == "Teacher")
        {
            var teacherCourseIds = await db.Courses
                .Where(c => c.TeacherId == CurrentUserId)
                .Select(c => c.Id)
                .ToListAsync();
            query = query.Where(a => teacherCourseIds.Contains(a.CourseId));
        }

        var result = await query.OrderByDescending(a => a.DueDate).Select(a => new {
            a.Id, a.Title, a.Description, a.DueDate, a.AttachmentUrl,
            Attachment = a.Attachment == null ? null : new {
                a.Attachment.PublicId, a.Attachment.OriginalName,
                a.Attachment.ContentType, a.Attachment.SizeBytes
            },
            Course = a.Course!.Title, a.CourseId, a.CreatedAt,
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
            .Include(x => x.Attachment)
            .Include(x => x.Submissions).ThenInclude(s => s.Student)
            .Include(x => x.Submissions).ThenInclude(s => s.File)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();

        if (!await CanSeeAssignmentAsync(a)) return Forbid();

        // A student sees only their own submission. Returning the whole list
        // would show one student another student's mark and feedback.
        var visible = CanGrade
            ? a.Submissions.ToList()
            : a.Submissions.Where(s => s.StudentId == CurrentUserId).ToList();

        return Ok(new
        {
            a.Id, a.Title, a.Description, a.DueDate, a.CourseId, a.CreatedAt,
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
        var course = await db.Courses.FindAsync(dto.CourseId);
        if (course == null) return BadRequest(new { message = "Khoá học không tồn tại." });

        // Teacher can only create for their own courses
        if (CurrentRole == "Teacher" && course.TeacherId != CurrentUserId)
            return Forbid();

        if (!await OwnsFileAsync(dto.AttachmentId))
            return BadRequest(new { message = "File đính kèm không hợp lệ." });

        var assignment = new Assignment
        {
            Title = dto.Title, Description = dto.Description,
            DueDate = dto.DueDate, CourseId = dto.CourseId,
            AttachmentUrl = string.IsNullOrWhiteSpace(dto.AttachmentUrl) ? null : dto.AttachmentUrl,
            AttachmentId = dto.AttachmentId
        };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();
        return Ok(assignment);
    }

    // ── UPDATE assignment ─────────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateAssignmentDto dto)
    {
        var a = await db.Assignments.Include(x => x.Course).Include(x => x.Attachment)
                                    .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (CurrentRole == "Teacher" && a.Course!.TeacherId != CurrentUserId) return Forbid();

        a.Title = dto.Title; a.Description = dto.Description; a.DueDate = dto.DueDate;

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
        return Ok(a);
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
        if (CurrentRole == "Teacher" && a.Course!.TeacherId != CurrentUserId) return Forbid();

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

        // Enrolment was previously unchecked here: any student could hand work
        // in to any course's assignment just by knowing its id.
        var enrolled = await db.Enrollments.AnyAsync(e =>
            e.CourseId == assignment.CourseId && e.StudentId == CurrentUserId && e.IsActive);
        if (!enrolled) return Forbid();

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
        var submission = await db.Submissions
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == assignmentId);
        if (submission == null) return NotFound();

        if (CurrentRole == "Teacher" && submission.Assignment!.Course!.TeacherId != CurrentUserId)
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

    /// <summary>Students must be enrolled and teachers must own the course; the
    /// list endpoints already filter this way, and the detail endpoint has to
    /// agree or it becomes the hole the list closed.</summary>
    private async Task<bool> CanSeeAssignmentAsync(Assignment a)
    {
        if (CurrentRole == "Admin") return true;
        if (CurrentRole == "Teacher")
            return await db.Courses.AnyAsync(c => c.Id == a.CourseId && c.TeacherId == CurrentUserId);

        return await db.Enrollments.AnyAsync(e =>
            e.CourseId == a.CourseId && e.StudentId == CurrentUserId && e.IsActive);
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
}

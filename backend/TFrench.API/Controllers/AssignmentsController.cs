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
    LearningAccessService access, AuditService audit, TimeProvider clock) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;
    private bool CanGrade => CurrentRole is "Admin" or "Teacher";
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

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
            a.Id, a.Title, a.Description, a.DueDate, a.OpenAt, a.CutoffAt, a.Status, a.AttachmentUrl,
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

        var last = a.Submissions.Where(x => x.StudentId == CurrentUserId)
            .Select(x => x.AttemptNumber).DefaultIfEmpty(0).Max();
        var grant = await db.AssignmentResubmissionGrants.FirstOrDefaultAsync(g =>
            g.AssignmentId == id && g.StudentId == CurrentUserId && g.AttemptNumber == last + 1 && g.CutoffAt > Now);
        var allowedAttemptNumber = grant?.AttemptNumber ?? (last == 0 && a.Status == AssignmentStatus.Published ? 1 : (int?)null);
        return Ok(new
        {
            a.Id, a.Title, a.Description, a.DueDate, a.OpenAt, a.CutoffAt, a.Status, a.CourseId, a.ClassId, a.CreatedAt,
            ClassName = a.Class == null ? null : a.Class.Name,
            ServerNow = Now, AllowedAttemptNumber = allowedAttemptNumber,
            EffectiveCutoffAt = grant?.CutoffAt ?? a.CutoffAt,
            a.AttachmentUrl,
            Attachment = Describe(a.Attachment),
            Course = a.Course == null ? null : new { a.Course.Id, a.Course.Title },
            Submissions = visible.Select(s => new
            {
                s.Id, s.StudentId, s.AttemptNumber, s.Note, s.FileUrl, s.IsLate, s.ReleasedAt,
                Grade = CanGrade || s.ReleasedAt != null ? s.Grade : null,
                Feedback = CanGrade || s.ReleasedAt != null ? s.Feedback : null,
                s.SubmittedAt, GradedAt = CanGrade || s.ReleasedAt != null ? s.GradedAt : null,
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
        if (dto.DueDate.ToUniversalTime() <= Now)
            return BadRequest(new { message = "Hạn nộp phải ở tương lai." });
        var timingError = ValidateTiming(dto);
        if (timingError != null) return BadRequest(new { message = timingError });
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
            OpenAt = dto.OpenAt?.ToUniversalTime() ?? Now,
            CutoffAt = dto.AllowLate ? dto.CutoffAt!.Value.ToUniversalTime() : dto.DueDate.ToUniversalTime(),
            DueDate = dto.DueDate.ToUniversalTime(), CourseId = dto.CourseId, ClassId = dto.ClassId,
            AttachmentUrl = string.IsNullOrWhiteSpace(dto.AttachmentUrl) ? null : dto.AttachmentUrl,
            AttachmentId = dto.AttachmentId
        };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();
        return Ok(new
        {
            assignment.Id, assignment.Title, assignment.Description,
            assignment.DueDate, assignment.CourseId, assignment.ClassId,
            assignment.Status, assignment.OpenAt, assignment.CutoffAt,
            assignment.AttachmentUrl, assignment.AttachmentId, assignment.CreatedAt,
        });
    }

    // ── UPDATE assignment ─────────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateAssignmentDto dto)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var a = await db.Assignments.Include(x => x.Course).Include(x => x.Attachment)
                                    .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        if (a.Status != AssignmentStatus.Draft || await db.Submissions.AnyAsync(s => s.AssignmentId == id))
            return Conflict(new { message = "Chỉ sửa được bài tập nháp chưa có bài nộp." });
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tiêu đề bài tập phải có từ 1 đến 200 ký tự." });
        if (dto.CourseId != a.CourseId)
            return BadRequest(new { message = "Không thể chuyển bài tập sang khoá học khác sau khi tạo." });
        if (!await access.CanAttachToScopeAsync(dto.CourseId, dto.ClassId, CurrentUserId, CurrentRole))
            return BadRequest(new { message = "Lớp không thuộc khoá hoặc không thuộc giáo viên hiện tại." });
        if (dto.ClassId != a.ClassId)
            return BadRequest(new { message = "Không thể đổi phạm vi lớp của bài tập sau khi tạo." });
        if (dto.DueDate.ToUniversalTime() <= Now)
            return BadRequest(new { message = "Hạn nộp phải ở tương lai." });
        var timingError = ValidateTiming(dto);
        if (timingError != null) return BadRequest(new { message = timingError });
        if (dto.AttachmentId != null && !string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest(new { message = "Chỉ được chọn một file hoặc một link đính kèm." });
        if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl) && !IsHttpUrl(dto.AttachmentUrl))
            return BadRequest(new { message = "Link đính kèm phải là URL http/https hợp lệ." });

        StoredFile? replacedFile = null;
        a.Title = dto.Title; a.Description = dto.Description;
        a.DueDate = dto.DueDate.ToUniversalTime(); a.ClassId = dto.ClassId;
        a.OpenAt = dto.OpenAt?.ToUniversalTime() ?? Now;
        a.CutoffAt = dto.AllowLate ? dto.CutoffAt!.Value.ToUniversalTime() : a.DueDate;

        // Only replace the brief when a new one is supplied — see the same rule
        // in ResourcesController.Update.
        if (dto.AttachmentId != null && dto.AttachmentId != a.AttachmentId)
        {
            if (!await OwnsFileAsync(dto.AttachmentId))
                return BadRequest(new { message = "File đính kèm không hợp lệ." });

            var previous = a.Attachment;
            a.AttachmentId = dto.AttachmentId;
            a.AttachmentUrl = null;
            replacedFile = previous;
        }
        else if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl) && dto.AttachmentUrl != a.AttachmentUrl)
        {
            var previous = a.Attachment;
            a.AttachmentUrl = dto.AttachmentUrl;
            a.AttachmentId = null;
            replacedFile = previous;
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        await DeleteFileAsync(replacedFile);
        return Ok(new
        {
            a.Id, a.Title, a.Description, a.DueDate, a.OpenAt, a.CutoffAt, a.Status, a.CourseId, a.ClassId,
            a.AttachmentUrl, a.AttachmentId, a.CreatedAt,
        });
    }

    [HttpPost("{id}/publish")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Publish(int id)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var assignment = await db.Assignments.FindAsync(id);
        if (assignment == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        if (assignment.Status == AssignmentStatus.Published) return Ok(new { assignment.Status });
        if (assignment.Status != AssignmentStatus.Draft)
            return Conflict(new { message = "Bài tập đã đóng không thể công bố lại." });
        if (assignment.DueDate <= Now)
            return BadRequest(new { message = "Hạn nộp đã qua. Hãy sửa bản nháp trước khi công bố." });
        assignment.Status = AssignmentStatus.Published;
        audit.Record("AssignmentPublished", "Assignment", id);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { assignment.Status });
    }

    [HttpPost("{id}/close")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Close(int id)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var assignment = await db.Assignments.FindAsync(id);
        if (assignment == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        if (assignment.Status == AssignmentStatus.Closed) return Ok(new { assignment.Status });
        if (assignment.Status != AssignmentStatus.Published)
            return Conflict(new { message = "Chỉ đóng được bài tập đã công bố." });
        assignment.Status = AssignmentStatus.Closed;
        audit.Record("AssignmentClosed", "Assignment", id);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { assignment.Status });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var a = await db.Assignments
            .Include(x => x.Course)
            .Include(x => x.Attachment)
            .Include(x => x.Submissions).ThenInclude(s => s.File)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();

        if (a.Submissions.Count > 0)
            return Conflict(new { message = "Bài tập đã có bài nộp không thể xóa. Hãy đóng nhận bài để giữ lịch sử." });

        // Only assignments without submissions can reach this branch.
        var files = a.Attachment == null ? new List<StoredFile>() : [a.Attachment];

        db.Assignments.Remove(a);
        await db.SaveChangesAsync();

        await transaction.CommitAsync();
        foreach (var f in files) await DeleteFileAsync(f);
        return NoContent();
    }

    // ── SUBMIT assignment (Student only) ──────────────────────────────────────
    [HttpPost("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id, [FromBody] SubmitAssignmentDto dto)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
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
        var existing = await db.Submissions.Include(s => s.File)
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == CurrentUserId && s.AttemptNumber == dto.AttemptNumber);
        if (existing != null)
            return ExistingSubmissionResult(existing, dto);
        var lastAttempt = await db.Submissions.Where(s => s.AssignmentId == id && s.StudentId == CurrentUserId)
            .Select(s => (int?)s.AttemptNumber).MaxAsync() ?? 0;
        var grant = await db.AssignmentResubmissionGrants.FirstOrDefaultAsync(g =>
            g.AssignmentId == id && g.StudentId == CurrentUserId && g.AttemptNumber == dto.AttemptNumber);
        if (dto.AttemptNumber != lastAttempt + 1 || (dto.AttemptNumber > 1 && grant == null))
            return Conflict(new { message = "Lượt nộp này chưa được giáo viên cấp." });
        if (assignment.Status != AssignmentStatus.Published && grant == null)
            return Conflict(new { message = "Bài tập đã đóng nhận bài." });
        var receivedAt = Now;
        if (assignment.OpenAt.HasValue && receivedAt < assignment.OpenAt.Value)
            return Conflict(new { message = "Chưa đến giờ mở nhận bài." });
        var cutoff = grant?.CutoffAt ?? assignment.CutoffAt;
        if (cutoff.HasValue && receivedAt >= cutoff.Value)
            return Conflict(new { message = "Đã hết thời gian nhận bài." });

        if (!await OwnsFileAsync(dto.FileId))
            return BadRequest(new { message = "File nộp bài không hợp lệ." });

        var submission = new Submission
        {
            AssignmentId = id,
            StudentId = CurrentUserId,
            AttemptNumber = dto.AttemptNumber, SubmittedAt = receivedAt,
            IsLate = receivedAt > assignment.DueDate,
            Note = dto.Note,
            FileUrl = string.IsNullOrWhiteSpace(dto.FileUrl) ? null : dto.FileUrl,
            FileId = dto.FileId
        };
        db.Submissions.Add(submission);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // A second request can pass the read above before the first saves.
            // Only an existing attempt from this student resolves that race;
            // other database failures still propagate to the error handler.
            db.ChangeTracker.Clear();
            existing = await db.Submissions.Include(s => s.File)
                .SingleOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == CurrentUserId && s.AttemptNumber == dto.AttemptNumber);
            if (existing == null) throw;
            return ExistingSubmissionResult(existing, dto);
        }

        await db.Entry(submission).Reference(s => s.File).LoadAsync();
        await transaction.CommitAsync();
        return Ok(DescribeSubmission(submission));
    }

    // ── GRADE submission (Teacher/Admin only) ─────────────────────────────────
    [HttpPost("{assignmentId}/submissions/{submissionId}/grade")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Grade(int assignmentId, int submissionId, [FromBody] GradeSubmissionDto dto)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
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
        submission.GradedAt = Now;
        submission.ReleasedAt = null;
        audit.Record("AssignmentGraded", "Submission", submission.Id, new { dto.Grade });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

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
                s.Id, s.AttemptNumber, s.IsLate, s.SubmittedAt, s.ReleasedAt,
                Grade = s.ReleasedAt != null ? s.Grade : null,
                Feedback = s.ReleasedAt != null ? s.Feedback : null,
                GradedAt = s.ReleasedAt != null ? s.GradedAt : null, s.Note, s.FileUrl,
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
        // Persist replacement/removal first, then check all remaining associations.
        await db.SaveChangesAsync();
        if (await db.Resources.AnyAsync(r => r.FileId == file.Id) ||
            await db.Assignments.AnyAsync(a => a.AttachmentId == file.Id) ||
            await db.Submissions.AnyAsync(s => s.FileId == file.Id)) return;
        db.StoredFiles.Remove(file);
        await db.SaveChangesAsync();
        storage.Delete(file);
    }

    private static object? Describe(StoredFile? f) => f == null ? null : new
    {
        f.PublicId, f.OriginalName, f.ContentType, f.SizeBytes
    };

    private IActionResult ExistingSubmissionResult(Submission existing, SubmitAssignmentDto dto)
    {
        var fileUrl = string.IsNullOrWhiteSpace(dto.FileUrl) ? null : dto.FileUrl;
        return existing.FileId == dto.FileId && existing.FileUrl == fileUrl && existing.Note == dto.Note
            ? Ok(DescribeSubmission(existing))
            : Conflict(new { message = "Bạn đã nộp bài. Bài cũ được giữ nguyên; hiện chưa cho phép nộp lại." });
    }

    private static object DescribeSubmission(Submission submission) => new
    {
        submission.Id, submission.StudentId, submission.AttemptNumber, submission.Note, submission.FileUrl,
        submission.IsLate, submission.ReleasedAt,
        Grade = submission.ReleasedAt != null ? submission.Grade : null,
        Feedback = submission.ReleasedAt != null ? submission.Feedback : null,
        submission.SubmittedAt, GradedAt = submission.ReleasedAt != null ? submission.GradedAt : null,
        File = Describe(submission.File),
    };

    [HttpPost("{id}/submissions/{submissionId}/release")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Release(int id, int submissionId)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        var submission = await db.Submissions.FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == id);
        if (submission == null) return NotFound();
        if (!submission.Grade.HasValue) return Conflict(new { message = "Hãy chấm điểm trước khi công bố." });
        if (submission.ReleasedAt == null)
        {
            submission.ReleasedAt = Now;
            audit.Record("AssignmentResultReleased", "Submission", submissionId);
            await db.SaveChangesAsync();
        }
        await transaction.CommitAsync();
        return Ok(new { submission.Id, submission.ReleasedAt });
    }

    [HttpPost("{id}/resubmissions")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GrantResubmission(int id, [FromBody] GrantResubmissionDto dto)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        if (!await access.CanManageAssignmentAsync(id, CurrentUserId, CurrentRole)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length > 1000 || dto.CutoffAt.ToUniversalTime() <= Now)
            return BadRequest(new { message = "Cần lý do (1–1000 ký tự) và hạn nộp lại ở tương lai." });
        if (!await access.CanSeeAssignmentAsync(id, dto.StudentId, "Student")) return Forbid();
        var latest = await db.Submissions.Where(s => s.AssignmentId == id && s.StudentId == dto.StudentId)
            .Select(s => (int?)s.AttemptNumber).MaxAsync();
        if (!latest.HasValue) return Conflict(new { message = "Học viên chưa có bài nộp để cấp lượt tiếp theo." });
        var next = latest.Value + 1;
        if (await db.AssignmentResubmissionGrants.AnyAsync(g => g.AssignmentId == id && g.StudentId == dto.StudentId && g.AttemptNumber == next))
            return Conflict(new { message = "Lượt tiếp theo đã được cấp. Không tạo thêm lượt khi chưa nộp lượt này." });
        var grant = new AssignmentResubmissionGrant
        {
            AssignmentId = id, StudentId = dto.StudentId, AttemptNumber = next,
            Reason = dto.Reason.Trim(), CutoffAt = dto.CutoffAt.ToUniversalTime(), GrantedById = CurrentUserId, CreatedAt = Now,
        };
        db.AssignmentResubmissionGrants.Add(grant);
        audit.Record("AssignmentResubmissionGranted", "Assignment", id, new { dto.StudentId, AttemptNumber = next, grant.Reason, grant.CutoffAt });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { grant.AttemptNumber, grant.CutoffAt, grant.Reason });
    }

    private string? ValidateTiming(CreateAssignmentDto dto)
    {
        var open = dto.OpenAt?.ToUniversalTime() ?? Now;
        var due = dto.DueDate.ToUniversalTime();
        if (open >= due) return "Giờ mở phải trước hạn nộp.";
        if (dto.AllowLate && (!dto.CutoffAt.HasValue || dto.CutoffAt.Value.ToUniversalTime() <= due))
            return "Cho nộp trễ cần giờ khóa sau hạn nộp.";
        return null;
    }

    private static bool IsHttpUrl(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

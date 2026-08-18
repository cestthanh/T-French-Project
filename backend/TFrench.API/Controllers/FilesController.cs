using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

/// <summary>
/// Upload and download for everything the centre hosts itself.
///
/// The whole point of routing downloads through a controller — rather than
/// dropping files in wwwroot — is this class: a file URL is worthless without
/// a token, and the token is checked against what the file is attached to. A
/// student who guesses another course's file id still gets a 403.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(AppDbContext db, FileStorageService storage) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── UPLOAD ────────────────────────────────────────────────────────────────
    // Any signed-in user may upload: students need it to hand in work. What the
    // file may then be attached to is enforced by the owning controller.
    [HttpPost]
    [RequestSizeLimit(30 * 1024 * 1024)] // a little above the 25 MB rule, so an
                                         // oversized file gets our message and
                                         // not Kestrel's bare 413
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file == null)
            return BadRequest(new { message = "Chưa chọn file." });

        StoredFile stored;
        try
        {
            stored = await storage.SaveAsync(file, CurrentUserId, ct);
        }
        catch (FileValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        db.StoredFiles.Add(stored);
        await db.SaveChangesAsync(ct);

        return Ok(Describe(stored));
    }

    // ── DOWNLOAD ──────────────────────────────────────────────────────────────
    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> Download(Guid publicId)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.PublicId == publicId);
        if (file == null) return NotFound();

        if (!await CanAccessAsync(file))
            return Forbid();

        var path = storage.ResolvePath(file);
        if (path == null)
            return NotFound(new { message = "File không còn tồn tại trên máy chủ." });

        // `enableRangeProcessing` lets the browser seek within audio without
        // pulling the whole file down first.
        return PhysicalFile(path, file.ContentType, file.OriginalName, enableRangeProcessing: true);
    }

    // ── METADATA ──────────────────────────────────────────────────────────────
    // Lets a screen show "bai-tap.pdf · 1.2 MB" for a file it only holds an id
    // for, without downloading it. Same access rule as the download itself.
    [HttpGet("{publicId:guid}/info")]
    public async Task<IActionResult> Info(Guid publicId)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.PublicId == publicId);
        if (file == null) return NotFound();
        if (!await CanAccessAsync(file)) return Forbid();
        return Ok(Describe(file));
    }

    /// <summary>
    /// May the caller read this file? Answered from what the file is attached
    /// to, checked in order of how cheap the check is.
    /// </summary>
    private async Task<bool> CanAccessAsync(StoredFile file)
    {
        // Admins see everything; uploaders see their own work, including a file
        // that has been uploaded but not yet attached to anything.
        if (CurrentRole == "Admin") return true;
        if (file.UploadedById == CurrentUserId) return true;

        // ── as course material ────────────────────────────────────────────────
        var resource = await db.Resources.AsNoTracking()
            .FirstOrDefaultAsync(r => r.FileId == file.Id);
        if (resource != null)
        {
            if (resource.IsPublic) return true;
            if (resource.CourseId == null) return false;   // private and unattached
            return await HasCourseAccessAsync(resource.CourseId.Value);
        }

        // ── as an assignment brief ────────────────────────────────────────────
        var assignment = await db.Assignments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.AttachmentId == file.Id);
        if (assignment != null)
            return await HasCourseAccessAsync(assignment.CourseId);

        // ── as a student's submission ─────────────────────────────────────────
        // Only the author (already covered above) and the teacher who has to
        // mark it. Other students on the same course must not see each other's
        // work, so this deliberately does not reuse HasCourseAccessAsync.
        var submission = await db.Submissions.AsNoTracking()
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .FirstOrDefaultAsync(s => s.FileId == file.Id);
        if (submission != null)
        {
            if (submission.StudentId == CurrentUserId) return true;
            return CurrentRole == "Teacher"
                && submission.Assignment?.Course?.TeacherId == CurrentUserId;
        }

        // Attached to nothing we recognise: refuse.
        return false;
    }

    /// <summary>True for a student actively enrolled on the course, or the
    /// teacher who runs it.</summary>
    private async Task<bool> HasCourseAccessAsync(int courseId)
    {
        if (CurrentRole == "Teacher")
            return await db.Courses.AnyAsync(c => c.Id == courseId && c.TeacherId == CurrentUserId);

        return await db.Enrollments.AnyAsync(e =>
            e.CourseId == courseId && e.StudentId == CurrentUserId && e.IsActive);
    }

    private object Describe(StoredFile f) => new
    {
        f.Id,
        f.PublicId,
        f.OriginalName,
        f.ContentType,
        f.SizeBytes,
        f.CreatedAt,
    };
}

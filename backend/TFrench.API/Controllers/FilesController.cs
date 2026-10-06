using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
public class FilesController(AppDbContext db, FileStorageService storage,
    LearningAccessService access) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── UPLOAD ────────────────────────────────────────────────────────────────
    // Any signed-in user may upload: students need it to hand in work. What the
    // file may then be attached to is enforced by the owning controller.
    [HttpPost]
    [EnableRateLimiting("uploads")]
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

        // A file can be reused by several records. Any authorized association
        // grants access; an earlier private association cannot shadow a public one.
        if (await access.VisibleResources(CurrentUserId, CurrentRole).AnyAsync(r => r.FileId == file.Id)) return true;
        if (await access.VisibleAssignments(CurrentUserId, CurrentRole).AnyAsync(a => a.AttachmentId == file.Id)) return true;
        if (await db.Submissions.AnyAsync(s => s.FileId == file.Id && s.StudentId == CurrentUserId)) return true;
        if (CurrentRole is not ("Admin" or "Teacher")) return false;
        return await db.Submissions.AnyAsync(s => s.FileId == file.Id &&
            access.VisibleAssignments(CurrentUserId, CurrentRole).Any(a => a.Id == s.AssignmentId));
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

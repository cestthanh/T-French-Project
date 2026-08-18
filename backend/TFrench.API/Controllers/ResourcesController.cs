using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourcesController(AppDbContext db, FileStorageService storage) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── GET all resources the user can access ─────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.Resources.Include(r => r.UploadedBy).Include(r => r.File).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(r => r.Category == category);

        // Students: only public resources + resources for their enrolled courses
        if (CurrentRole == "Student")
        {
            var enrolledIds = await db.Enrollments
                .Where(e => e.StudentId == CurrentUserId && e.IsActive)
                .Select(e => e.CourseId).ToListAsync();

            query = query.Where(r => r.IsPublic || (r.CourseId != null && enrolledIds.Contains(r.CourseId.Value)));
        }
        // Teachers: own uploads + public
        else if (CurrentRole == "Teacher")
        {
            query = query.Where(r => r.IsPublic || r.UploadedById == CurrentUserId);
        }
        // Admin: see everything

        var result = await query.OrderByDescending(r => r.CreatedAt).Select(r => new {
            r.Id, r.Title, r.Description, r.FileUrl, r.FileType,
            r.Category, r.IsPublic, r.CreatedAt, r.CourseId,
            UploadedBy = r.UploadedBy!.FullName,
            // Only the public id is exposed: the numeric FileId would let a
            // client probe the file table directly.
            File = r.File == null ? null : new {
                r.File.PublicId, r.File.OriginalName, r.File.ContentType, r.File.SizeBytes
            }
        }).ToListAsync();

        return Ok(result);
    }

    // ── GET categories list ───────────────────────────────────────────────────
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await db.Resources
            .Where(r => r.Category != null)
            .Select(r => r.Category!)
            .Distinct()
            .ToListAsync();
        return Ok(cats);
    }

    // ── CREATE resource (Teacher/Admin) ───────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateResourceDto dto)
    {
        if (dto.FileId == null && string.IsNullOrWhiteSpace(dto.FileUrl))
            return BadRequest(new { message = "Cần tải lên một file hoặc dán link tài liệu." });

        if (!await OwnsFileAsync(dto.FileId))
            return BadRequest(new { message = "File tải lên không hợp lệ." });

        var resource = new Resource
        {
            Title = dto.Title,
            Description = dto.Description,
            FileUrl = string.IsNullOrWhiteSpace(dto.FileUrl) ? null : dto.FileUrl,
            FileId = dto.FileId,
            FileType = dto.FileType,
            Category = dto.Category,
            IsPublic = dto.IsPublic,
            CourseId = dto.CourseId,
            UploadedById = CurrentUserId
        };
        db.Resources.Add(resource);
        await db.SaveChangesAsync();
        return Ok(resource);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateResourceDto dto)
    {
        var r = await db.Resources.Include(x => x.File).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();
        if (CurrentRole == "Teacher" && r.UploadedById != CurrentUserId) return Forbid();

        r.Title = dto.Title; r.Description = dto.Description;
        r.Category = dto.Category; r.IsPublic = dto.IsPublic;

        // Swapping the attachment: only when a new file is supplied, so an edit
        // that just fixes a typo in the title cannot drop the file by omission.
        if (dto.FileId != null && dto.FileId != r.FileId)
        {
            if (!await OwnsFileAsync(dto.FileId))
                return BadRequest(new { message = "File tải lên không hợp lệ." });

            var previous = r.File;
            r.FileId = dto.FileId;
            r.FileUrl = null;
            await DeleteFileAsync(previous);
        }
        else if (!string.IsNullOrWhiteSpace(dto.FileUrl) && dto.FileUrl != r.FileUrl)
        {
            var previous = r.File;
            r.FileUrl = dto.FileUrl;
            r.FileId = null;
            await DeleteFileAsync(previous);
        }

        await db.SaveChangesAsync();
        return Ok(r);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await db.Resources.Include(x => x.File).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();
        if (CurrentRole == "Teacher" && r.UploadedById != CurrentUserId) return Forbid();

        var file = r.File;
        db.Resources.Remove(r);
        await db.SaveChangesAsync();
        await DeleteFileAsync(file);   // after the row is gone, so a failure here
                                       // leaves an orphan file rather than a
                                       // resource pointing at missing bytes
        return NoContent();
    }

    /// <summary>
    /// True when <paramref name="fileId"/> is null (nothing claimed) or names a
    /// file the caller uploaded. Without this check a teacher could attach
    /// another teacher's file id to a public resource and publish it.
    /// </summary>
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
}

// DTO — FileUrl and FileId are alternatives: an uploaded copy, or a link out.
public record CreateResourceDto(
    string Title, string? Description, string? FileUrl, int? FileId,
    string? FileType, string? Category, bool IsPublic, int? CourseId);

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourcesController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── GET all resources the user can access ─────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.Resources.Include(r => r.UploadedBy).AsQueryable();

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
            UploadedBy = r.UploadedBy!.FullName
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
        var resource = new Resource
        {
            Title = dto.Title,
            Description = dto.Description,
            FileUrl = dto.FileUrl,
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
        var r = await db.Resources.FindAsync(id);
        if (r == null) return NotFound();
        if (CurrentRole == "Teacher" && r.UploadedById != CurrentUserId) return Forbid();

        r.Title = dto.Title; r.Description = dto.Description;
        r.Category = dto.Category; r.IsPublic = dto.IsPublic;
        await db.SaveChangesAsync();
        return Ok(r);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await db.Resources.FindAsync(id);
        if (r == null) return NotFound();
        if (CurrentRole == "Teacher" && r.UploadedById != CurrentUserId) return Forbid();
        db.Resources.Remove(r);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// DTO
public record CreateResourceDto(string Title, string? Description, string FileUrl, string? FileType, string? Category, bool IsPublic, int? CourseId);

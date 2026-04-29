using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    // ── PLATFORM STATS ────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers       = await db.Users.CountAsync();
        var totalStudents    = await db.Users.CountAsync(u => u.Role == UserRole.Student);
        var totalTeachers    = await db.Users.CountAsync(u => u.Role == UserRole.Teacher);
        var totalCourses     = await db.Courses.CountAsync();
        var totalAssignments = await db.Assignments.CountAsync();
        var totalSubmissions = await db.Submissions.CountAsync();
        var pendingGrading   = await db.Submissions.CountAsync(s => s.Grade == null);
        var totalBookings    = await db.BookingSlots.CountAsync(s => s.IsBooked);
        var publishedPosts   = await db.BlogPosts.CountAsync(p => p.IsPublished);

        return Ok(new {
            totalUsers, totalStudents, totalTeachers,
            totalCourses, totalAssignments, totalSubmissions,
            pendingGrading, totalBookings, publishedPosts
        });
    }

    // ── USER MANAGEMENT ───────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] string? search)
    {
        var query = db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, out var roleParsed))
            query = query.Where(u => u.Role == roleParsed);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(u =>
            u.FullName.Contains(search) || u.Email.Contains(search));

        var users = await query.OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.Email, Role = u.Role.ToString(), u.PhoneNumber, u.AvatarUrl, u.CreatedAt })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, out var parsedRole))
            return BadRequest(new { message = "Role không hợp lệ." });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = parsedRole;
        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Role });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── BLOG MANAGEMENT ───────────────────────────────────────────────────────
    [HttpGet("blog")]
    public async Task<IActionResult> GetAllBlogPosts()
    {
        var posts = await db.BlogPosts
            .Include(p => p.Author)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new {
                p.Id, p.Title, p.Slug, p.IsPublished, p.PublishedAt, p.CreatedAt,
                Author = p.Author!.FullName, p.Tags, p.CoverImageUrl
            }).ToListAsync();
        return Ok(posts);
    }

    [HttpPost("blog")]
    public async Task<IActionResult> CreateBlogPost([FromBody] CreateAdminBlogDto dto)
    {
        var adminId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var post = new BlogPost
        {
            Title = dto.Title,
            Slug  = dto.Slug.ToLower().Replace(" ", "-"),
            Summary = dto.Summary,
            Content = dto.Content,
            Tags = dto.Tags,
            CoverImageUrl = dto.CoverImageUrl,
            AuthorId = adminId,
            IsPublished = dto.IsPublished,
            PublishedAt = dto.IsPublished ? DateTime.UtcNow : null
        };
        db.BlogPosts.Add(post);
        await db.SaveChangesAsync();
        return Ok(post);
    }

    [HttpPatch("blog/{id}/publish")]
    public async Task<IActionResult> TogglePublish(int id)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();
        post.IsPublished = !post.IsPublished;
        post.PublishedAt = post.IsPublished ? DateTime.UtcNow : null;
        await db.SaveChangesAsync();
        return Ok(new { post.Id, post.IsPublished });
    }

    [HttpDelete("blog/{id}")]
    public async Task<IActionResult> DeleteBlogPost(int id)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();
        db.BlogPosts.Remove(post);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// DTOs local to Admin scope
public record ChangeRoleDto(string Role);
public record CreateAdminBlogDto(string Title, string Slug, string? Summary, string Content, string? Tags, string? CoverImageUrl, bool IsPublished = false);

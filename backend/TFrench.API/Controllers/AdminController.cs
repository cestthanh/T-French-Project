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
[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db, AuditService audit) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

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
            .Select(u => new { u.Id, u.FullName, u.Email, Role = u.Role.ToString(), u.PhoneNumber, u.AvatarUrl, u.IsActive, u.CreatedAt })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var parsedRole))
            return BadRequest(new { message = "Role không hợp lệ." });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (id == CurrentUserId && parsedRole != UserRole.Admin)
            return BadRequest(new { message = "Bạn không thể tự hạ quyền tài khoản đang đăng nhập." });

        if (user.Role == UserRole.Admin && parsedRole != UserRole.Admin &&
            await db.Users.CountAsync(u => u.Role == UserRole.Admin && u.IsActive) <= 1)
            return Conflict(new { message = "Không thể hạ quyền quản trị viên đang hoạt động cuối cùng." });

        var previousRole = user.Role;
        user.Role = parsedRole;
        audit.Record("UserRoleChanged", "User", user.Id,
            new { From = previousRole.ToString(), To = parsedRole.ToString() });
        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Role });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (id == CurrentUserId)
            return BadRequest(new { message = "Bạn không thể tự xoá tài khoản đang đăng nhập." });
        if (user.Role == UserRole.Admin &&
            await db.Users.CountAsync(u => u.Role == UserRole.Admin && u.IsActive) <= 1)
            return Conflict(new { message = "Không thể xoá quản trị viên đang hoạt động cuối cùng." });

        audit.Record("UserDeleted", "User", user.Id, new { user.Email, Role = user.Role.ToString() });
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("users/{id}/active")]
    public async Task<IActionResult> SetUserActive(int id, [FromBody] SetUserActiveDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (id == CurrentUserId && !dto.IsActive)
            return BadRequest(new { message = "Bạn không thể tự vô hiệu hoá tài khoản đang đăng nhập." });
        if (user.Role == UserRole.Admin && user.IsActive && !dto.IsActive &&
            await db.Users.CountAsync(u => u.Role == UserRole.Admin && u.IsActive) <= 1)
            return Conflict(new { message = "Không thể vô hiệu hoá quản trị viên cuối cùng." });

        user.IsActive = dto.IsActive;
        audit.Record(dto.IsActive ? "UserActivated" : "UserDeactivated", "User", user.Id, new { user.Email });
        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.IsActive });
    }

    [HttpGet("audit")]
    public async Task<IActionResult> GetAuditLog([FromQuery] string? action, [FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);
        var query = db.AuditLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
        var rows = await query.OrderByDescending(a => a.CreatedAt).Take(take).Select(a => new
        {
            a.Id, a.Action, a.EntityType, a.EntityId, a.MetadataJson, a.IpAddress, a.CreatedAt,
            Actor = a.ActorUser == null ? null : a.ActorUser.FullName,
        }).ToListAsync();
        return Ok(rows);
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
                p.UpdatedAt, Author = p.Author!.FullName, p.Tags, p.CoverImageUrl
            }).ToListAsync();
        return Ok(posts);
    }

    // The list above omits Summary and Content — they are large and nothing on
    // that screen renders them. Editing needs the whole post, so it gets its
    // own endpoint rather than bloating every list response.
    [HttpGet("blog/{id}")]
    public async Task<IActionResult> GetBlogPost(int id)
    {
        var post = await db.BlogPosts
            .Include(p => p.Author)
            .Where(p => p.Id == id)
            .Select(p => new {
                p.Id, p.Title, p.Slug, p.Summary, p.Content, p.Tags, p.CoverImageUrl,
                p.IsPublished, p.PublishedAt, p.CreatedAt, p.UpdatedAt,
                Author = p.Author!.FullName
            })
            .FirstOrDefaultAsync();

        return post == null ? NotFound() : Ok(post);
    }

    [HttpPost("blog")]
    public async Task<IActionResult> CreateBlogPost([FromBody] CreateAdminBlogDto dto)
    {
        var adminId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var slug = Normalise(dto.Slug);

        // Slug is uniquely indexed. Without this check the clash arrives as a
        // DbUpdateException and the caller sees a 500 for what is really a
        // "pick another slug".
        if (await db.BlogPosts.AnyAsync(p => p.Slug == slug))
            return Conflict(new { message = $"Slug \"{slug}\" đã được dùng cho bài viết khác." });

        var post = new BlogPost
        {
            Title = dto.Title,
            Slug  = slug,
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

    [HttpPut("blog/{id}")]
    public async Task<IActionResult> UpdateBlogPost(int id, [FromBody] CreateAdminBlogDto dto)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();

        var slug = Normalise(dto.Slug);
        if (await db.BlogPosts.AnyAsync(p => p.Slug == slug && p.Id != id))
            return Conflict(new { message = $"Slug \"{slug}\" đã được dùng cho bài viết khác." });

        post.Title = dto.Title;
        post.Slug = slug;
        post.Summary = dto.Summary;
        post.Content = dto.Content;
        post.Tags = dto.Tags;
        post.CoverImageUrl = dto.CoverImageUrl;
        post.UpdatedAt = DateTime.UtcNow;

        // PublishedAt is the moment it first went live, so it is stamped only
        // on the transition. Editing a live post must not move its date.
        if (dto.IsPublished != post.IsPublished)
        {
            post.IsPublished = dto.IsPublished;
            post.PublishedAt = dto.IsPublished ? (post.PublishedAt ?? DateTime.UtcNow) : null;
        }

        await db.SaveChangesAsync();
        return Ok(new { post.Id, post.Title, post.Slug, post.IsPublished, post.UpdatedAt });
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

    /// <summary>Lower-cased, spaces to hyphens — the same shape the public blog
    /// route looks posts up by.</summary>
    private static string Normalise(string slug) => slug.Trim().ToLower().Replace(" ", "-");
}

// DTOs local to Admin scope
public record ChangeRoleDto(string Role);
public record SetUserActiveDto(bool IsActive);
public record CreateAdminBlogDto(string Title, string Slug, string? Summary, string Content, string? Tags, string? CoverImageUrl, bool IsPublished = false);

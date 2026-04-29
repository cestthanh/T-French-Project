using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.DTOs;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlogController(AppDbContext db) : ControllerBase
{
    // Public: list published posts
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? tag, [FromQuery] int page = 1, [FromQuery] int pageSize = 9)
    {
        var query = db.BlogPosts
            .Include(b => b.Author)
            .Where(b => b.IsPublished);

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(b => b.Tags != null && b.Tags.Contains(tag));

        var total = await query.CountAsync();
        var posts = await query
            .OrderByDescending(b => b.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new {
                b.Id, b.Title, b.Slug, b.Summary, b.CoverImageUrl,
                b.Tags, b.PublishedAt,
                Author = b.Author!.FullName
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, posts });
    }

    // Public: get single post by slug
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var post = await db.BlogPosts
            .Include(b => b.Author)
            .Where(b => b.Slug == slug && b.IsPublished)
            .FirstOrDefaultAsync();

        if (post == null) return NotFound();

        return Ok(new {
            post.Id, post.Title, post.Slug, post.Summary,
            post.Content, post.CoverImageUrl, post.Tags, post.PublishedAt,
            Author = post.Author?.FullName
        });
    }

    // Admin/Teacher: create post
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateBlogPostDto dto)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        if (await db.BlogPosts.AnyAsync(b => b.Slug == dto.Slug))
            return Conflict(new { message = "Slug đã tồn tại." });

        var post = new BlogPost
        {
            Title = dto.Title, Slug = dto.Slug, Summary = dto.Summary,
            Content = dto.Content, Tags = dto.Tags, CoverImageUrl = dto.CoverImageUrl,
            AuthorId = userId, IsPublished = false
        };

        db.BlogPosts.Add(post);
        await db.SaveChangesAsync();
        return Ok(post);
    }

    // Admin/Teacher: publish/unpublish
    [HttpPatch("{id}/publish")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Publish(int id)
    {
        var post = await db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();
        post.IsPublished = !post.IsPublished;
        post.PublishedAt = post.IsPublished ? DateTime.UtcNow : null;
        await db.SaveChangesAsync();
        return Ok(new { post.IsPublished });
    }
}

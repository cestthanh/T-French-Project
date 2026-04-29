using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController(AppDbContext db) : ControllerBase
{
    private int? CurrentUserId => User.Identity?.IsAuthenticated == true
        ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value) : null;
    private string? CurrentRole => User.Identity?.IsAuthenticated == true
        ? User.FindFirst(ClaimTypes.Role)!.Value : null;

    // ── GET all published courses (public) ────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var courses = await db.Courses
            .Include(c => c.Teacher)
            .Where(c => c.IsPublished)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new {
                c.Id, c.Title, c.Description, c.Level, c.Price, c.ImageUrl, c.CreatedAt,
                Teacher = c.Teacher!.FullName,
                EnrollmentCount = c.Enrollments.Count(e => e.IsActive)
            })
            .ToListAsync();
        return Ok(courses);
    }

    // ── GET course detail (public) ────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var course = await db.Courses
            .Include(c => c.Teacher)
            .Include(c => c.Assignments)
            .Include(c => c.Resources.Where(r => r.IsPublic))
            .FirstOrDefaultAsync(c => c.Id == id && c.IsPublished);

        if (course == null) return NotFound();

        bool isEnrolled = false;
        if (CurrentUserId.HasValue)
        {
            isEnrolled = await db.Enrollments.AnyAsync(e =>
                e.StudentId == CurrentUserId.Value && e.CourseId == id && e.IsActive);
        }

        return Ok(new {
            course.Id, course.Title, course.Description, course.Level, course.Price,
            course.ImageUrl, course.CreatedAt,
            Teacher = course.Teacher!.FullName,
            TeacherId = course.TeacherId,
            AssignmentCount = course.Assignments.Count,
            ResourceCount = course.Resources.Count,
            IsEnrolled = isEnrolled,
            EnrollmentCount = await db.Enrollments.CountAsync(e => e.CourseId == id && e.IsActive)
        });
    }

    // ── ENROLL in course (Student) ────────────────────────────────────────────
    [HttpPost("{id}/enroll")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Enroll(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var course = await db.Courses.FindAsync(id);
        if (course == null || !course.IsPublished)
            return NotFound(new { message = "Khoá học không tồn tại." });

        var existing = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == userId && e.CourseId == id);

        if (existing != null)
        {
            if (existing.IsActive) return Conflict(new { message = "Bạn đã đăng ký khoá học này." });
            existing.IsActive = true;
            await db.SaveChangesAsync();
            return Ok(new { message = "Đã đăng ký lại khoá học!" });
        }

        db.Enrollments.Add(new Enrollment { StudentId = userId, CourseId = id, IsActive = true });
        await db.SaveChangesAsync();
        return Ok(new { message = "Đăng ký khoá học thành công! 🎉" });
    }

    // ── MY COURSES (authenticated) ────────────────────────────────────────────
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> MyCourses()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var role   = User.FindFirst(ClaimTypes.Role)!.Value;

        if (role == "Student")
        {
            var courses = await db.Enrollments
                .Include(e => e.Course).ThenInclude(c => c!.Teacher)
                .Where(e => e.StudentId == userId && e.IsActive)
                .Select(e => new {
                    e.Course!.Id, e.Course.Title, e.Course.Description,
                    e.Course.Level, e.Course.ImageUrl, e.EnrolledAt,
                    Teacher = e.Course.Teacher!.FullName
                }).ToListAsync();
            return Ok(courses);
        }
        else // Teacher / Admin
        {
            var courses = await db.Courses
                .Where(c => c.TeacherId == userId || role == "Admin")
                .Select(c => new {
                    c.Id, c.Title, c.Level, c.IsPublished,
                    c.Price, c.CreatedAt,
                    EnrollmentCount = c.Enrollments.Count(e => e.IsActive)
                }).ToListAsync();
            return Ok(courses);
        }
    }

    // ── CREATE course (Teacher/Admin) ─────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateCourseDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var course = new Course
        {
            Title = dto.Title, Description = dto.Description,
            Level = dto.Level, Price = dto.Price,
            ImageUrl = dto.ImageUrl, TeacherId = userId,
            IsPublished = false
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return Ok(course);
    }

    // ── TOGGLE publish ────────────────────────────────────────────────────────
    [HttpPatch("{id}/publish")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> TogglePublish(int id)
    {
        var course = await db.Courses.FindAsync(id);
        if (course == null) return NotFound();
        course.IsPublished = !course.IsPublished;
        await db.SaveChangesAsync();
        return Ok(new { course.Id, course.IsPublished });
    }
}

public record CreateCourseDto(string Title, string? Description, string? Level, decimal Price = 0, string? ImageUrl = null);

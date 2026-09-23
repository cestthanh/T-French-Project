using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Data;
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
                EnrollmentCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Active)
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

        EnrollmentStatus? enrollmentStatus = null;
        if (CurrentUserId.HasValue)
        {
            enrollmentStatus = await db.Enrollments
                .Where(e => e.StudentId == CurrentUserId.Value && e.CourseId == id &&
                    (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending))
                .Select(e => (EnrollmentStatus?)e.Status)
                .FirstOrDefaultAsync();
        }

        return Ok(new {
            course.Id, course.Title, course.Description, course.Level, course.Price,
            course.ImageUrl, course.CreatedAt,
            Teacher = course.Teacher!.FullName,
            TeacherId = course.TeacherId,
            AssignmentCount = course.Assignments.Count,
            ResourceCount = course.Resources.Count,
            IsEnrolled = enrollmentStatus == EnrollmentStatus.Active,
            EnrollmentStatus = enrollmentStatus == null ? null : enrollmentStatus.ToString(),
            EnrollmentCount = await db.Enrollments.CountAsync(e => e.CourseId == id && e.Status == EnrollmentStatus.Active),
            Classes = await db.CourseClasses
                .Where(x => x.CourseId == id && x.Status == ClassStatus.Open)
                .OrderBy(x => x.StartDate)
                .Select(x => new {
                    x.Id, x.Name, x.StartDate, x.EndDate, x.Capacity, x.Modality,
                    x.ScheduleSummary, Teacher = x.Teacher!.FullName,
                    EnrollmentCount = x.Enrollments.Count(e =>
                        e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending)
                }).ToListAsync()
        });
    }

    // ── ENROLL in course (Student) ────────────────────────────────────────────
    [HttpPost("{id}/enroll")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Enroll(int id, [FromBody] EnrollCourseDto? dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var course = await db.Courses.FindAsync(id);
        if (course == null || !course.IsPublished)
            return NotFound(new { message = "Khoá học không tồn tại." });

        var classQuery = db.CourseClasses.Where(c => c.CourseId == id && c.Status == ClassStatus.Open);
        var targetClass = dto?.ClassId is int classId
            ? await classQuery.FirstOrDefaultAsync(c => c.Id == classId)
            : await classQuery.OrderBy(c => c.StartDate).FirstOrDefaultAsync();

        if (targetClass == null)
            return Conflict(new { message = "Khoá học hiện chưa có lớp đang mở đăng ký." });

        var currentEnrollment = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == userId && e.CourseId == id &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (currentEnrollment != null)
            return Conflict(new { message = "Bạn đã có một đăng ký đang hiệu lực cho khoá học này." });

        var reserved = await db.Enrollments.CountAsync(e => e.ClassId == targetClass.Id &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (reserved >= targetClass.Capacity)
            return Conflict(new { message = "Lớp học đã đủ sĩ số." });

        var nextStatus = course.Price > 0 ? EnrollmentStatus.Pending : EnrollmentStatus.Active;
        var existing = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == userId && e.ClassId == targetClass.Id);

        if (existing != null)
        {
            if (existing.Status is EnrollmentStatus.Active or EnrollmentStatus.Pending)
                return Conflict(new { message = "Bạn đã đăng ký lớp học này." });
            existing.Status = nextStatus;
            existing.IsActive = nextStatus == EnrollmentStatus.Active;
            existing.EnrolledAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(new { message = nextStatus == EnrollmentStatus.Active
                ? "Đã đăng ký lại lớp học!"
                : "Yêu cầu đăng ký đang chờ xác nhận.", status = nextStatus.ToString() });
        }

        db.Enrollments.Add(new Enrollment
        {
            StudentId = userId,
            CourseId = id,
            ClassId = targetClass.Id,
            Status = nextStatus,
            IsActive = nextStatus == EnrollmentStatus.Active,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new
        {
            message = nextStatus == EnrollmentStatus.Active
                ? "Đăng ký lớp học thành công! 🎉"
                : "Yêu cầu đăng ký đang chờ xác nhận.",
            status = nextStatus.ToString(),
        });
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
                .Where(e => e.StudentId == userId && e.Status == EnrollmentStatus.Active)
                .Select(e => new {
                    e.Course!.Id, e.Course.Title, e.Course.Description,
                    e.Course.Level, e.Course.ImageUrl, e.EnrolledAt,
                    Teacher = e.Class != null ? e.Class.Teacher!.FullName : e.Course.Teacher!.FullName,
                    ClassId = e.ClassId,
                    ClassName = e.Class != null ? e.Class.Name : null,
                    Status = e.Status.ToString()
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
                    EnrollmentCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Active),
                    ClassCount = c.Classes.Count
                }).ToListAsync();
            return Ok(courses);
        }
    }

    // ── CREATE course (Teacher/Admin) ─────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateCourseDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tên khoá học phải có từ 1 đến 200 ký tự." });
        if (dto.Description?.Length > 4000)
            return BadRequest(new { message = "Mô tả khoá học không được vượt quá 4.000 ký tự." });
        if (dto.Price < 0 || dto.Price > 1_000_000_000)
            return BadRequest(new { message = "Học phí không hợp lệ." });
        if (!string.IsNullOrWhiteSpace(dto.ImageUrl) &&
            (!Uri.TryCreate(dto.ImageUrl, UriKind.Absolute, out var imageUri) ||
             imageUri.Scheme is not ("http" or "https")))
            return BadRequest(new { message = "URL ảnh phải sử dụng http hoặc https." });

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var teacherId = userId;

        if (CurrentRole == "Admin")
        {
            if (!dto.TeacherId.HasValue)
                return BadRequest(new { message = "Admin cần chọn giáo viên phụ trách khoá học." });

            var validTeacher = await db.Users.AnyAsync(u =>
                u.Id == dto.TeacherId.Value && u.Role == UserRole.Teacher && u.IsActive);
            if (!validTeacher)
                return BadRequest(new { message = "Giáo viên phụ trách không hợp lệ." });

            teacherId = dto.TeacherId.Value;
        }

        var course = new Course
        {
            Title = dto.Title.Trim(), Description = Clean(dto.Description),
            Level = Clean(dto.Level), Price = dto.Price,
            ImageUrl = Clean(dto.ImageUrl), TeacherId = teacherId,
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
        if (CurrentRole == "Teacher" && course.TeacherId != CurrentUserId)
            return Forbid();

        course.IsPublished = !course.IsPublished;
        await db.SaveChangesAsync();
        return Ok(new { course.Id, course.IsPublished });
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record CreateCourseDto(
    string Title,
    string? Description,
    string? Level,
    decimal Price = 0,
    string? ImageUrl = null,
    int? TeacherId = null);

public record EnrollCourseDto(int? ClassId);

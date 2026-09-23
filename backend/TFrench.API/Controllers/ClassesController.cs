using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize]
public class ClassesController(AppDbContext db, AuditService audit) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    [HttpGet("course/{courseId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicForCourse(int courseId)
    {
        var courseExists = await db.Courses.AnyAsync(c => c.Id == courseId && c.IsPublished);
        if (!courseExists) return NotFound();

        var classes = await db.CourseClasses
            .Where(c => c.CourseId == courseId && c.Status == ClassStatus.Open)
            .OrderBy(c => c.StartDate)
            .Select(c => new
            {
                c.Id, c.Name, c.StartDate, c.EndDate, c.Capacity, c.Modality,
                c.ScheduleSummary, c.LocationOrMeetingUrl,
                Teacher = c.Teacher!.FullName,
                EnrollmentCount = c.Enrollments.Count(e =>
                    e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending),
            })
            .ToListAsync();

        return Ok(classes);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetManagedClasses([FromQuery] int? courseId)
    {
        var query = db.CourseClasses.AsQueryable();
        if (CurrentRole == "Teacher") query = query.Where(c => c.TeacherId == CurrentUserId);
        if (courseId.HasValue) query = query.Where(c => c.CourseId == courseId.Value);

        var classes = await query
            .OrderByDescending(c => c.StartDate)
            .Select(c => new
            {
                c.Id, c.Name, c.CourseId, Course = c.Course!.Title,
                c.TeacherId, Teacher = c.Teacher!.FullName,
                c.StartDate, c.EndDate, c.Capacity, c.Modality, c.Status,
                c.ScheduleSummary, c.LocationOrMeetingUrl, c.CreatedAt,
                EnrollmentCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Active),
                PendingCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Pending),
            })
            .ToListAsync();

        return Ok(classes);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] SaveClassDto dto)
    {
        var validation = await ValidateAsync(dto);
        if (validation != null) return validation;

        var teacherId = CurrentRole == "Teacher" ? CurrentUserId : dto.TeacherId!.Value;
        var item = new CourseClass
        {
            Name = dto.Name.Trim(),
            CourseId = dto.CourseId,
            TeacherId = teacherId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Capacity = dto.Capacity,
            Modality = dto.Modality,
            Status = dto.Status,
            ScheduleSummary = Clean(dto.ScheduleSummary),
            LocationOrMeetingUrl = Clean(dto.LocationOrMeetingUrl),
        };

        db.CourseClasses.Add(item);
        await db.SaveChangesAsync();
        return Ok(new { item.Id, item.Name, item.CourseId, item.TeacherId, item.Status });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveClassDto dto)
    {
        var item = await db.CourseClasses.FindAsync(id);
        if (item == null) return NotFound();
        if (CurrentRole == "Teacher" && item.TeacherId != CurrentUserId) return Forbid();

        var validation = await ValidateAsync(dto);
        if (validation != null) return validation;
        if (dto.CourseId != item.CourseId && await db.Enrollments.AnyAsync(e => e.ClassId == id))
            return Conflict(new { message = "Không thể chuyển lớp đã có học viên sang khoá học khác." });

        item.Name = dto.Name.Trim();
        item.CourseId = dto.CourseId;
        item.TeacherId = CurrentRole == "Teacher" ? CurrentUserId : dto.TeacherId!.Value;
        item.StartDate = dto.StartDate;
        item.EndDate = dto.EndDate;
        item.Capacity = dto.Capacity;
        item.Modality = dto.Modality;
        item.Status = dto.Status;
        item.ScheduleSummary = Clean(dto.ScheduleSummary);
        item.LocationOrMeetingUrl = Clean(dto.LocationOrMeetingUrl);

        await db.SaveChangesAsync();
        return Ok(new { item.Id, item.Name, item.CourseId, item.TeacherId, item.Status });
    }

    [HttpGet("{id}/enrollments")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetEnrollments(int id)
    {
        var item = await db.CourseClasses.FindAsync(id);
        if (item == null) return NotFound();
        if (CurrentRole == "Teacher" && item.TeacherId != CurrentUserId) return Forbid();

        var rows = await db.Enrollments
            .Where(e => e.ClassId == id)
            .OrderByDescending(e => e.EnrolledAt)
            .Select(e => new
            {
                e.Id, e.StudentId, Student = e.Student!.FullName, e.Student.Email,
                e.Status, e.EnrolledAt,
            })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPatch("enrollments/{enrollmentId}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetEnrollmentStatus(int enrollmentId, [FromBody] SetEnrollmentStatusDto dto)
    {
        var enrollment = await db.Enrollments.FindAsync(enrollmentId);
        if (enrollment == null) return NotFound();

        if (dto.Status is EnrollmentStatus.Active or EnrollmentStatus.Pending &&
            enrollment.ClassId.HasValue)
        {
            var classInfo = await db.CourseClasses.FindAsync(enrollment.ClassId.Value);
            if (classInfo == null) return Conflict(new { message = "Lớp học không còn tồn tại." });
            var occupied = await db.Enrollments.CountAsync(e => e.ClassId == classInfo.Id &&
                e.Id != enrollment.Id &&
                (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
            if (occupied >= classInfo.Capacity)
                return Conflict(new { message = "Lớp học đã đủ sĩ số." });
        }

        enrollment.Status = dto.Status;
        enrollment.IsActive = dto.Status == EnrollmentStatus.Active;
        audit.Record("EnrollmentStatusChanged", "Enrollment", enrollment.Id,
            new { enrollment.StudentId, enrollment.ClassId, Status = dto.Status.ToString() });
        await db.SaveChangesAsync();
        return Ok(new { enrollment.Id, enrollment.Status, enrollment.IsActive });
    }

    [HttpPost("{id}/enrollments")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddEnrollment(int id, [FromBody] AddClassEnrollmentDto dto)
    {
        var classInfo = await db.CourseClasses.FindAsync(id);
        if (classInfo == null) return NotFound();
        if (classInfo.Status == ClassStatus.Cancelled)
            return Conflict(new { message = "Không thể ghi danh vào lớp đã huỷ." });

        var validStudent = await db.Users.AnyAsync(u =>
            u.Id == dto.StudentId && u.Role == UserRole.Student && u.IsActive);
        if (!validStudent)
            return BadRequest(new { message = "Học viên không hợp lệ hoặc đã bị vô hiệu hoá." });

        var occupied = await db.Enrollments.CountAsync(e => e.ClassId == id &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (dto.Status is EnrollmentStatus.Active or EnrollmentStatus.Pending && occupied >= classInfo.Capacity)
            return Conflict(new { message = "Lớp học đã đủ sĩ số." });

        var otherCurrent = await db.Enrollments.AnyAsync(e =>
            e.StudentId == dto.StudentId && e.CourseId == classInfo.CourseId && e.ClassId != id &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (otherCurrent)
            return Conflict(new { message = "Học viên đã có đăng ký đang hiệu lực ở lớp khác của khoá này." });

        var enrollment = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == dto.StudentId && e.ClassId == id);
        if (enrollment == null)
        {
            enrollment = new Enrollment
            {
                StudentId = dto.StudentId,
                CourseId = classInfo.CourseId,
                ClassId = id,
            };
            db.Enrollments.Add(enrollment);
        }

        enrollment.Status = dto.Status;
        enrollment.IsActive = dto.Status == EnrollmentStatus.Active;
        enrollment.EnrolledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        audit.Record("StudentAddedToClass", "Enrollment", enrollment.Id,
            new { enrollment.StudentId, ClassId = id, Status = dto.Status.ToString() });
        await db.SaveChangesAsync();
        return Ok(new { enrollment.Id, enrollment.Status });
    }

    private async Task<IActionResult?> ValidateAsync(SaveClassDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Trim().Length > 200)
            return BadRequest(new { message = "Tên lớp phải có từ 1 đến 200 ký tự." });
        if (dto.Capacity is < 1 or > 500)
            return BadRequest(new { message = "Sĩ số phải nằm trong khoảng 1–500." });
        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu." });

        var course = await db.Courses.FindAsync(dto.CourseId);
        if (course == null) return BadRequest(new { message = "Khoá học không tồn tại." });
        if (CurrentRole == "Teacher" && course.TeacherId != CurrentUserId)
            return Forbid();

        var teacherId = CurrentRole == "Teacher" ? CurrentUserId : dto.TeacherId;
        if (!teacherId.HasValue || !await db.Users.AnyAsync(u =>
                u.Id == teacherId && u.Role == UserRole.Teacher && u.IsActive))
            return BadRequest(new { message = "Giáo viên phụ trách không hợp lệ." });

        return null;
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record SaveClassDto(
    string Name,
    int CourseId,
    int? TeacherId,
    DateTime StartDate,
    DateTime? EndDate,
    int Capacity,
    ClassModality Modality,
    ClassStatus Status,
    string? ScheduleSummary,
    string? LocationOrMeetingUrl);

public record SetEnrollmentStatusDto(EnrollmentStatus Status);
public record AddClassEnrollmentDto(int StudentId, EnrollmentStatus Status = EnrollmentStatus.Active);

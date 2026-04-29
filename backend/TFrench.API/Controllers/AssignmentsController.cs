using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.DTOs;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── GET all assignments (filtered by course/role) ─────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? courseId)
    {
        var query = db.Assignments
            .Include(a => a.Course)
            .AsQueryable();

        if (courseId.HasValue)
            query = query.Where(a => a.CourseId == courseId.Value);

        // Students only see assignments for courses they're enrolled in
        if (CurrentRole == "Student")
        {
            var enrolledCourseIds = await db.Enrollments
                .Where(e => e.StudentId == CurrentUserId && e.IsActive)
                .Select(e => e.CourseId)
                .ToListAsync();
            query = query.Where(a => enrolledCourseIds.Contains(a.CourseId));
        }
        // Teachers only see assignments for courses they teach
        else if (CurrentRole == "Teacher")
        {
            var teacherCourseIds = await db.Courses
                .Where(c => c.TeacherId == CurrentUserId)
                .Select(c => c.Id)
                .ToListAsync();
            query = query.Where(a => teacherCourseIds.Contains(a.CourseId));
        }

        var result = await query.OrderByDescending(a => a.DueDate).Select(a => new {
            a.Id, a.Title, a.Description, a.DueDate, a.AttachmentUrl,
            Course = a.Course!.Title, a.CourseId, a.CreatedAt,
            SubmissionCount = a.Submissions.Count
        }).ToListAsync();

        return Ok(result);
    }

    // ── GET single assignment by id ───────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var a = await db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Submissions).ThenInclude(s => s.Student)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (a == null) return NotFound();
        return Ok(a);
    }

    // ── CREATE assignment (Teacher/Admin only) ────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentDto dto)
    {
        var course = await db.Courses.FindAsync(dto.CourseId);
        if (course == null) return BadRequest(new { message = "Khoá học không tồn tại." });

        // Teacher can only create for their own courses
        if (CurrentRole == "Teacher" && course.TeacherId != CurrentUserId)
            return Forbid();

        var assignment = new Assignment
        {
            Title = dto.Title, Description = dto.Description,
            DueDate = dto.DueDate, CourseId = dto.CourseId
        };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();
        return Ok(assignment);
    }

    // ── UPDATE assignment ─────────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateAssignmentDto dto)
    {
        var a = await db.Assignments.Include(x => x.Course).FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (CurrentRole == "Teacher" && a.Course!.TeacherId != CurrentUserId) return Forbid();

        a.Title = dto.Title; a.Description = dto.Description; a.DueDate = dto.DueDate;
        await db.SaveChangesAsync();
        return Ok(a);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await db.Assignments.Include(x => x.Course).FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        if (CurrentRole == "Teacher" && a.Course!.TeacherId != CurrentUserId) return Forbid();
        db.Assignments.Remove(a);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── SUBMIT assignment (Student only) ──────────────────────────────────────
    [HttpPost("{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id)
    {
        var assignment = await db.Assignments.FindAsync(id);
        if (assignment == null) return NotFound();

        // Check already submitted
        var existing = await db.Submissions
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == CurrentUserId);
        if (existing != null)
            return Conflict(new { message = "Bạn đã nộp bài cho bài tập này." });

        var submission = new Submission
        {
            AssignmentId = id,
            StudentId = CurrentUserId,
            Note = Request.Form["note"].FirstOrDefault()
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();
        return Ok(submission);
    }

    // ── GRADE submission (Teacher/Admin only) ─────────────────────────────────
    [HttpPost("{assignmentId}/submissions/{submissionId}/grade")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Grade(int assignmentId, int submissionId, [FromBody] GradeSubmissionDto dto)
    {
        var submission = await db.Submissions
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == assignmentId);
        if (submission == null) return NotFound();

        if (CurrentRole == "Teacher" && submission.Assignment!.Course!.TeacherId != CurrentUserId)
            return Forbid();

        submission.Grade = dto.Grade;
        submission.Feedback = dto.Feedback;
        submission.GradedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(submission);
    }

    // ── GET my submissions (Student) ──────────────────────────────────────────
    [HttpGet("my-submissions")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> MySubmissions()
    {
        var subs = await db.Submissions
            .Include(s => s.Assignment).ThenInclude(a => a!.Course)
            .Where(s => s.StudentId == CurrentUserId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new {
                s.Id, s.SubmittedAt, s.Grade, s.Feedback, s.GradedAt, s.Note,
                Assignment = s.Assignment!.Title,
                Course = s.Assignment.Course!.Title,
                DueDate = s.Assignment.DueDate
            })
            .ToListAsync();
        return Ok(subs);
    }
}

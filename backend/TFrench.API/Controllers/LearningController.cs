using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController, Route("api/learning"), Authorize]
public class LearningController(AppDbContext db, LearningAccessService access, TimeProvider clock) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;
    private bool Staff => Role is "Admin" or "Teacher";
    private IQueryable<CourseClass> Classes => Role switch
    {
        "Admin" => db.CourseClasses,
        "Teacher" => db.CourseClasses.Where(c => c.TeacherId == UserId),
        _ => db.CourseClasses.Where(c => c.Enrollments.Any(e => e.StudentId == UserId && e.Status == EnrollmentStatus.Active)),
    };

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses() => Ok(await Classes.OrderBy(c => c.Name)
        .Select(c => new { c.Id, c.Name, c.CourseId, Course = c.Course!.Title }).ToListAsync());

    [HttpGet("classes/{id}/overview")]
    public async Task<IActionResult> Overview(int id)
    {
        var cohort = await Classes.FirstOrDefaultAsync(c => c.Id == id);
        if (cohort == null) return Forbid();
        var now = clock.GetUtcNow().UtcDateTime;
        var assignments = await access.VisibleAssignments(UserId, Role)
            .Where(a => a.ClassId == id || (a.ClassId == null && a.CourseId == cohort.CourseId))
            .OrderBy(a => a.DueDate).ToListAsync();
        var assignmentIds = assignments.Select(a => a.Id).ToArray();
        var submissions = await db.Submissions.Where(s => assignmentIds.Contains(s.AssignmentId) && (Staff || s.StudentId == UserId)).ToListAsync();
        var grants = await db.AssignmentResubmissionGrants.Where(g => assignmentIds.Contains(g.AssignmentId) && g.StudentId == UserId && g.CutoffAt > now).ToListAsync();
        var quizzes = await db.Quizzes.Where(q => q.ClassId == id && (Staff || q.IsPublished || q.Attempts.Any(a => a.StudentId == UserId)))
            .OrderBy(q => q.CloseAt).Select(q => new { q.Id, q.Title, q.IsPublished, q.OpenAt, q.CloseAt }).ToListAsync();
        var quizIds = quizzes.Select(q => q.Id).ToArray();
        var attempts = await db.QuizAttempts.Where(a => quizIds.Contains(a.QuizId) && (Staff || a.StudentId == UserId)).ToListAsync();
        var activities = new List<Activity>();
        foreach (var a in assignments)
        {
            var last = submissions.Where(s => s.AssignmentId == a.Id && s.StudentId == UserId).MaxBy(s => s.AttemptNumber);
            var grant = grants.FirstOrDefault(g => g.AssignmentId == a.Id && g.AttemptNumber == (last?.AttemptNumber ?? 0) + 1);
            var state = a.Status == AssignmentStatus.Draft ? "Draft" :
                grant != null ? "Resubmission" : last != null ? (last.ReleasedAt != null ? "Released" : "Submitted") :
                a.Status == AssignmentStatus.Closed || a.CutoffAt <= now ? "Closed" :
                a.OpenAt > now ? "Upcoming" : a.DueDate < now ? "Late" : "Open";
            activities.Add(new Activity(a.Id, "Assignment", a.Title, a.DueDate, state,
                Staff ? submissions.Count(s => s.AssignmentId == a.Id && s.Grade == null) : 0,
                $"/dashboard/assignments/{a.Id}"));
        }
        foreach (var q in quizzes)
        {
            var attempt = attempts.FirstOrDefault(a => a.QuizId == q.Id && a.StudentId == UserId);
            var state = attempt != null ? (attempt.ReleasedAt != null ? "Released" : attempt.Status == QuizAttemptStatus.InProgress ? "InProgress" : "Submitted") :
                !q.IsPublished ? "Draft" : q.OpenAt > now ? "Upcoming" : q.CloseAt <= now ? "Closed" : "Open";
            activities.Add(new Activity(q.Id, "Quiz", q.Title, q.CloseAt, state,
                Staff ? attempts.Count(a => a.QuizId == q.Id && a.Status == QuizAttemptStatus.PendingGrading) : 0,
                "/dashboard/quizzes"));
        }
        var resources = await access.VisibleResources(UserId, Role)
            .Where(r => r.ClassId == id || (r.ClassId == null && (r.CourseId == cohort.CourseId || r.IsPublic && r.CourseId == null)))
            .OrderByDescending(r => r.CreatedAt).Select(r => new { r.Id, r.Title, r.CreatedAt }).ToListAsync();
        return Ok(new { cohort.Id, cohort.Name, ServerNow = now, Activities = activities.OrderBy(a => a.At).ToList(), Resources = resources });
    }

    [HttpGet("classes/{id}/gradebook")]
    public async Task<IActionResult> Gradebook(int id)
    {
        var cohort = await Classes.FirstOrDefaultAsync(c => c.Id == id);
        if (cohort == null) return Forbid();
        var students = await db.Enrollments.Where(e => e.ClassId == id && e.Status == EnrollmentStatus.Active && (Staff || e.StudentId == UserId))
            .Select(e => new { e.StudentId, Name = e.Student!.FullName }).ToListAsync();
        var assignments = await access.VisibleAssignments(UserId, Role)
            .Where(a => a.ClassId == id || a.ClassId == null && a.CourseId == cohort.CourseId)
            .OrderBy(a => a.DueDate).Select(a => new { a.Id, a.Title }).ToListAsync();
        var quizzes = await db.Quizzes.Where(q => q.ClassId == id && (Staff || q.IsPublished || q.Attempts.Any(a => a.StudentId == UserId)))
            .OrderBy(q => q.CloseAt).Select(q => new { q.Id, q.Title, Max = q.Questions.Sum(x => (double)x.Points) }).ToListAsync();
        var studentIds = students.Select(s => s.StudentId).ToArray();
        var assignmentIds = assignments.Select(a => a.Id).ToArray();
        var quizIds = quizzes.Select(q => q.Id).ToArray();
        var submissions = await db.Submissions.Where(s => assignmentIds.Contains(s.AssignmentId) && studentIds.Contains(s.StudentId)).ToListAsync();
        var attempts = await db.QuizAttempts.Where(a => quizIds.Contains(a.QuizId) && studentIds.Contains(a.StudentId)).ToListAsync();
        var columns = assignments.Select(a => new GradeColumn($"a-{a.Id}", "Assignment", a.Title, 10m))
            .Concat(quizzes.Select(q => new GradeColumn($"q-{q.Id}", "Quiz", q.Title, (decimal)q.Max))).ToList();
        var rows = students.Select(student =>
        {
            var cells = new Dictionary<string, GradeCell>();
            foreach (var a in assignments)
            {
                var s = submissions.Where(s => s.AssignmentId == a.Id && s.StudentId == student.StudentId).MaxBy(s => s.AttemptNumber);
                var earned = s != null && (Staff || s.ReleasedAt != null) ? s.Grade : null;
                cells[$"a-{a.Id}"] = Cell(earned, 10, s != null, s?.ReleasedAt != null);
            }
            foreach (var q in quizzes)
            {
                var a = attempts.FirstOrDefault(a => a.QuizId == q.Id && a.StudentId == student.StudentId);
                var earned = a != null && (Staff || a.ReleasedAt != null) ? a.Score : null;
                cells[$"q-{q.Id}"] = Cell(earned, (decimal)q.Max, a != null, a?.ReleasedAt != null);
            }
            return new { student.StudentId, student.Name, Cells = cells };
        });
        return Ok(new { Columns = columns, Rows = rows });
    }

    private static GradeCell Cell(decimal? earned, decimal max, bool submitted, bool released) =>
        new(earned, max, earned.HasValue && max > 0 ? Math.Round(earned.Value / max * 100, 2) : null,
            released ? "Released" : submitted ? "Pending" : "NotSubmitted");
    public record Activity(int Id, string Kind, string Title, DateTime At, string State, int PendingGrading, string Path);
    public record GradeColumn(string Key, string Kind, string Title, decimal Max);
    public record GradeCell(decimal? Earned, decimal Max, decimal? Percent, string State);
}

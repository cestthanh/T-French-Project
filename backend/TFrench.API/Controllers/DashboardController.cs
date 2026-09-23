using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

/// <summary>
/// User-level dashboard stats — one endpoint for all roles.
/// Admin uses AdminController/stats for platform-wide numbers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (CurrentRole == "Student")
        {
            // Enrolled courses
            var enrolledIds = await db.Enrollments
                .Where(e => e.StudentId == CurrentUserId && e.Status == EnrollmentStatus.Active)
                .Select(e => e.CourseId).ToListAsync();

            // Pending assignments (enrolled, not yet submitted)
            var submittedIds = await db.Submissions
                .Where(s => s.StudentId == CurrentUserId)
                .Select(s => s.AssignmentId).ToListAsync();

            var pendingAssignments = await db.Assignments
                .Where(a => enrolledIds.Contains(a.CourseId)
                         && !submittedIds.Contains(a.Id)
                         && a.DueDate > DateTime.UtcNow)
                .CountAsync();

            var overdueAssignments = await db.Assignments
                .Where(a => enrolledIds.Contains(a.CourseId)
                         && !submittedIds.Contains(a.Id)
                         && a.DueDate <= DateTime.UtcNow)
                .CountAsync();

            var gradedCount = await db.Submissions
                .Where(s => s.StudentId == CurrentUserId && s.Grade != null)
                .CountAsync();

            var upcomingBookings = await db.BookingSlots
                .Where(s => s.StudentId == CurrentUserId
                         && s.IsBooked
                         && s.StartTime > DateTime.UtcNow)
                .CountAsync();

            var resources = await db.Resources
                .Where(r => r.IsPublic || (r.CourseId != null && enrolledIds.Contains(r.CourseId.Value)))
                .CountAsync();

            return Ok(new {
                role = "Student",
                enrolledCourses   = enrolledIds.Count,
                pendingAssignments,
                overdueAssignments,
                gradedSubmissions = gradedCount,
                upcomingBookings,
                accessibleResources = resources
            });
        }

        if (CurrentRole == "Teacher")
        {
            var myCourseIds = await db.Courses
                .Where(c => c.TeacherId == CurrentUserId)
                .Select(c => c.Id).ToListAsync();

            var totalStudents = await db.Enrollments
                .Where(e => myCourseIds.Contains(e.CourseId) && e.Status == EnrollmentStatus.Active)
                .Select(e => e.StudentId).Distinct().CountAsync();

            var pendingGrading = await db.Submissions
                .Where(s => myCourseIds.Contains(
                    db.Assignments.Where(a => a.Id == s.AssignmentId).Select(a => a.CourseId).First())
                    && s.Grade == null)
                .CountAsync();

            var upcomingBookings = await db.BookingSlots
                .Where(s => s.TeacherId == CurrentUserId
                         && s.IsBooked
                         && s.StartTime > DateTime.UtcNow)
                .CountAsync();

            return Ok(new {
                role = "Teacher",
                myCourses       = myCourseIds.Count,
                totalStudents,
                pendingGrading,
                upcomingBookings
            });
        }

        // Admin — redirect to AdminController/stats
        return Ok(new { role = "Admin", message = "Use /api/admin/stats" });
    }
}

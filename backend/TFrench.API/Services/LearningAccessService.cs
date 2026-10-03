using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Services;

/// <summary>
/// One scope rule for lists, detail endpoints and file downloads. A null
/// ClassId keeps historic course-wide content visible to active enrolments;
/// a populated ClassId narrows access to one concrete cohort.
/// </summary>
public class LearningAccessService(AppDbContext db)
{
    public IQueryable<Resource> VisibleResources(int userId, string role)
    {
        var resources = db.Resources.AsQueryable();
        return role switch
        {
            "Admin" => resources,
            "Student" => resources.Where(r => r.IsPublic ||
                (r.ClassId != null
                    ? db.Enrollments.Any(e => e.ClassId == r.ClassId && e.StudentId == userId &&
                        e.Status == EnrollmentStatus.Active)
                    : r.CourseId != null && db.Enrollments.Any(e => e.CourseId == r.CourseId &&
                        e.StudentId == userId && e.Status == EnrollmentStatus.Active))),
            "Teacher" => resources.Where(r => r.IsPublic || r.UploadedById == userId ||
                (r.ClassId != null
                    ? db.CourseClasses.Any(c => c.Id == r.ClassId && c.TeacherId == userId)
                    : r.CourseId != null &&
                      (db.Courses.Any(c => c.Id == r.CourseId && c.TeacherId == userId) ||
                       db.CourseClasses.Any(c => c.CourseId == r.CourseId && c.TeacherId == userId)))),
            _ => resources.Where(_ => false),
        };
    }

    public IQueryable<Assignment> VisibleAssignments(int userId, string role)
    {
        var assignments = db.Assignments.AsQueryable();
        return role switch
        {
            "Admin" => assignments,
            "Student" => assignments.Where(a => a.Status != AssignmentStatus.Draft && (a.ClassId != null
                ? db.Enrollments.Any(e => e.ClassId == a.ClassId && e.StudentId == userId &&
                    e.Status == EnrollmentStatus.Active)
                : db.Enrollments.Any(e => e.CourseId == a.CourseId && e.StudentId == userId &&
                    e.Status == EnrollmentStatus.Active))),
            "Teacher" => assignments.Where(a => a.ClassId != null
                ? db.CourseClasses.Any(c => c.Id == a.ClassId && c.TeacherId == userId)
                : db.Courses.Any(c => c.Id == a.CourseId && c.TeacherId == userId)),
            _ => assignments.Where(_ => false),
        };
    }

    public Task<bool> CanSeeResourceAsync(int id, int userId, string role) =>
        VisibleResources(userId, role).AnyAsync(r => r.Id == id);

    public Task<bool> CanSeeAssignmentAsync(int id, int userId, string role) =>
        VisibleAssignments(userId, role).AnyAsync(a => a.Id == id);

    public Task<bool> CanManageAssignmentAsync(int id, int userId, string role) =>
        role == "Student" ? Task.FromResult(false) : CanSeeAssignmentAsync(id, userId, role);

    public async Task<bool> CanAttachToScopeAsync(int? courseId, int? classId, int userId, string role)
    {
        if (role is not ("Admin" or "Teacher")) return false;
        if (classId.HasValue)
            return courseId.HasValue && await db.CourseClasses.AnyAsync(c =>
                c.Id == classId && c.CourseId == courseId &&
                (role == "Admin" || c.TeacherId == userId));
        if (courseId.HasValue)
            return await db.Courses.AnyAsync(c => c.Id == courseId &&
                (role == "Admin" || c.TeacherId == userId));
        return true;
    }
}

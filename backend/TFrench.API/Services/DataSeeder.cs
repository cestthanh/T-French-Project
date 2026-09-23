using TFrench.API.Data;
using TFrench.API.Models;
using Microsoft.EntityFrameworkCore;

namespace TFrench.API.Services;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // ── Upsert demo users ─────────────────────────────────────────────────
        var admin   = await UpsertUser(db, "Super Admin",     "admin@tfrench.vn",   "Admin@123",   UserRole.Admin);
        var teacher = await UpsertUser(db, "Giáo viên Demo",  "teacher@tfrench.vn", "Teacher@123", UserRole.Teacher);
        var student = await UpsertUser(db, "Học viên Demo",   "student@tfrench.vn", "Student@123", UserRole.Student);

        // ── Seed Course (skip if exists) ──────────────────────────────────────
        Course? course = await db.Courses.FirstOrDefaultAsync();
        if (course == null)
        {
            course = new Course
            {
                Title       = "Tiếng Pháp A1 — Cơ bản",
                Description = "Khoá học tiếng Pháp dành cho người mới bắt đầu",
                Level       = "A1",
                Price       = 0,
                IsPublished = true,
                TeacherId   = teacher.Id
            };
            db.Courses.Add(course);
            await db.SaveChangesAsync();
        }

        // ── Default class/cohort ──────────────────────────────────────────────
        var courseClass = await db.CourseClasses.FirstOrDefaultAsync(c => c.CourseId == course.Id);
        if (courseClass == null)
        {
            courseClass = new CourseClass
            {
                Name = "Lớp A1 Demo",
                CourseId = course.Id,
                TeacherId = teacher.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(7),
                EndDate = DateTime.UtcNow.Date.AddMonths(3),
                Capacity = 20,
                Modality = ClassModality.Online,
                Status = ClassStatus.Open,
                ScheduleSummary = "Lịch học sẽ được trung tâm xác nhận",
            };
            db.CourseClasses.Add(courseClass);
            await db.SaveChangesAsync();
        }

        // ── Enrollment (skip if exists) ───────────────────────────────────────
        var enrollment = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == student.Id && e.CourseId == course.Id);
        if (enrollment == null)
        {
            db.Enrollments.Add(new Enrollment
            {
                StudentId = student.Id,
                CourseId = course.Id,
                ClassId = courseClass.Id,
                Status = EnrollmentStatus.Active,
                IsActive = true,
            });
            await db.SaveChangesAsync();
        }
        else if (enrollment.ClassId == null)
        {
            enrollment.ClassId = courseClass.Id;
            enrollment.Status = enrollment.IsActive ? EnrollmentStatus.Active : EnrollmentStatus.Cancelled;
            await db.SaveChangesAsync();
        }

        // ── Resource (skip if exists) ─────────────────────────────────────────
        if (!await db.Resources.AnyAsync())
        {
            db.Resources.Add(new Resource
            {
                Title        = "Bảng chữ cái tiếng Pháp",
                Description  = "Video học bảng chữ cái và cách phát âm cơ bản",
                FileUrl      = "https://www.youtube.com/watch?v=SmZmBKc7Lrs",
                FileType     = "Video",
                Category     = "Phát âm",
                IsPublic     = true,
                CourseId     = course.Id,
                UploadedById = teacher.Id
            });
            await db.SaveChangesAsync();
        }

        // ── Assignment (skip if exists) ───────────────────────────────────────
        if (!await db.Assignments.AnyAsync())
        {
            db.Assignments.Add(new Assignment
            {
                Title       = "Bài tập 1: Tự giới thiệu bằng tiếng Pháp",
                Description = "Viết đoạn văn 5–10 câu tự giới thiệu bản thân",
                DueDate     = DateTime.UtcNow.AddDays(7),
                CourseId    = course.Id
            });
            await db.SaveChangesAsync();
        }

        // ── Blog post (skip if exists) ────────────────────────────────────────
        if (!await db.BlogPosts.AnyAsync())
        {
            db.BlogPosts.Add(new BlogPost
            {
                Title         = "Tại sao nên học tiếng Pháp?",
                Slug          = "tai-sao-nen-hoc-tieng-phap",
                Summary       = "Khám phá những lý do hàng đầu để bắt đầu hành trình học tiếng Pháp.",
                Content       = "<p>Tiếng Pháp là ngôn ngữ được nói bởi hơn 300 triệu người trên toàn thế giới.</p><h2>1. Mở ra cơ hội du học</h2><p>Pháp có hệ thống giáo dục đại học hàng đầu...</p>",
                Tags          = "Du học,Tiếng Pháp,Cơ hội",
                AuthorId      = admin.Id,
                IsPublished   = true,
                PublishedAt   = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }

    private static async Task<User> UpsertUser(AppDbContext db, string fullName, string email, string password, UserRole role)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            user = new User
            {
                FullName     = fullName,
                Email        = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role         = role,
                IsActive     = true
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        else
        {
            // Always reset demo account to correct role AND password
            bool changed = false;
            if (user.Role != role)         { user.Role         = role;                                    changed = true; }
            if (user.FullName != fullName) { user.FullName      = fullName;                                changed = true; }
            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                                           { user.PasswordHash  = BCrypt.Net.BCrypt.HashPassword(password); changed = true; }
            if (changed) await db.SaveChangesAsync();
        }
        return user;
    }
}

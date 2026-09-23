using Microsoft.EntityFrameworkCore;
using TFrench.API.Models;

namespace TFrench.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseClass> CourseClasses => Set<CourseClass>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<BookingSlot> BookingSlots => Set<BookingSlot>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<ContactLead> ContactLeads => Set<ContactLead>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();

        // Unique blog slug
        modelBuilder.Entity<BlogPost>()
            .HasIndex(b => b.Slug).IsUnique();

        // Files are looked up by their public GUID on every download.
        modelBuilder.Entity<StoredFile>()
            .HasIndex(f => f.PublicId).IsUnique();

        modelBuilder.Entity<StoredFile>()
            .HasOne(f => f.UploadedBy)
            .WithMany()
            .HasForeignKey(f => f.UploadedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Detaching a file must never take the row that referenced it with it —
        // an assignment whose brief was removed is still an assignment.
        modelBuilder.Entity<Resource>()
            .HasOne(r => r.File)
            .WithMany()
            .HasForeignKey(r => r.FileId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Assignment>()
            .HasOne(a => a.Attachment)
            .WithMany()
            .HasForeignKey(a => a.AttachmentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.File)
            .WithMany()
            .HasForeignKey(s => s.FileId)
            .OnDelete(DeleteBehavior.SetNull);

        // The enquiry list is always read newest-first, usually narrowed to one
        // status, so index the pair rather than either column alone.
        modelBuilder.Entity<ContactLead>()
            .HasIndex(l => new { l.Status, l.CreatedAt });

        // Removing an admin account must not take the enquiries they handled.
        modelBuilder.Entity<ContactLead>()
            .HasOne(l => l.HandledBy)
            .WithMany()
            .HasForeignKey(l => l.HandledById)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ContactLead>()
            .HasOne(l => l.Student)
            .WithMany()
            .HasForeignKey(l => l.StudentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ContactLead>()
            .HasOne(l => l.Enrollment)
            .WithMany()
            .HasForeignKey(l => l.EnrollmentId)
            .OnDelete(DeleteBehavior.SetNull);

        // Prevent cascade delete cycles
        modelBuilder.Entity<Course>()
            .HasOne(c => c.Teacher)
            .WithMany()
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CourseClass>()
            .HasOne(c => c.Teacher)
            .WithMany()
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CourseClass>()
            .HasOne(c => c.Course)
            .WithMany(c => c.Classes)
            .HasForeignKey(c => c.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Enrollment>()
            .HasOne(e => e.Class)
            .WithMany(c => c.Enrollments)
            .HasForeignKey(e => e.ClassId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Enrollment>()
            .HasIndex(e => new { e.ClassId, e.StudentId })
            .IsUnique()
            .HasFilter("\"ClassId\" IS NOT NULL");

        modelBuilder.Entity<BookingSlot>()
            .HasOne(b => b.Student)
            .WithMany(u => u.BookedSlots)
            .HasForeignKey(b => b.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.Student)
            .WithMany(u => u.Submissions)
            .HasForeignKey(s => s.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Quiz>()
            .HasOne(q => q.CreatedBy)
            .WithMany()
            .HasForeignKey(q => q.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Quiz>()
            .HasOne(q => q.Class)
            .WithMany()
            .HasForeignKey(q => q.ClassId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<QuizAttempt>()
            .HasIndex(a => new { a.QuizId, a.StudentId })
            .IsUnique();

        modelBuilder.Entity<AttemptAnswer>()
            .HasIndex(a => new { a.AttemptId, a.QuestionId })
            .IsUnique();

        modelBuilder.Entity<QuizAttempt>()
            .HasOne(a => a.Student)
            .WithMany()
            .HasForeignKey(a => a.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AttemptAnswer>()
            .HasOne(a => a.GradedBy)
            .WithMany()
            .HasForeignKey(a => a.GradedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.ActorUser)
            .WithMany()
            .HasForeignKey(a => a.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.CreatedAt);
    }
}

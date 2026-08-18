using Microsoft.EntityFrameworkCore;
using TFrench.API.Models;

namespace TFrench.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<BookingSlot> BookingSlots => Set<BookingSlot>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();

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

        // Prevent cascade delete cycles
        modelBuilder.Entity<Course>()
            .HasOne(c => c.Teacher)
            .WithMany()
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

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
    }
}

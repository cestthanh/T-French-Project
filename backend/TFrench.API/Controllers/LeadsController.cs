using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

/// <summary>
/// Study-abroad and course enquiries from the public site.
///
/// Creation is the only anonymous write in the API — it has to be, the whole
/// point is reaching people who have no account. Everything else is admin-only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LeadsController(AppDbContext db, AuditService audit) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    /// <summary>How long the same address has to wait before it can send a
    /// second enquiry. Long enough to stop a double-click or a bored visitor
    /// filling the table, short enough that a genuine follow-up the next day
    /// goes straight through.</summary>
    private static readonly TimeSpan RepeatWindow = TimeSpan.FromMinutes(10);

    // ── CREATE (public) ───────────────────────────────────────────────────────
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("public-leads")]
    public async Task<IActionResult> Create([FromBody] CreateLeadDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email)
            || string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Vui lòng điền họ tên, email và nội dung cần tư vấn." });
        if (dto.FullName.Trim().Length > 100 || dto.Email.Trim().Length > 200 || dto.Message.Trim().Length > 2000)
            return BadRequest(new { message = "Nội dung yêu cầu tư vấn vượt quá độ dài cho phép." });
        if (!new EmailAddressAttribute().IsValid(dto.Email.Trim()))
            return BadRequest(new { message = "Email không hợp lệ." });
        if (dto.PhoneNumber?.Trim().Length > 30 || dto.Interest?.Trim().Length > 100)
            return BadRequest(new { message = "Số điện thoại hoặc nội dung quan tâm quá dài." });

        var email = dto.Email.Trim().ToLowerInvariant();

        // A repeat within the window is answered with the same 200 the first
        // one got. Telling the sender their message was throttled invites them
        // to work around it, and a duplicated enquiry is not worth a scary error.
        var cutoff = DateTime.UtcNow - RepeatWindow;
        var recent = await db.ContactLeads
            .AnyAsync(l => l.Email == email && l.CreatedAt > cutoff);

        if (!recent)
        {
            db.ContactLeads.Add(new ContactLead
            {
                FullName = dto.FullName.Trim(),
                Email = email,
                PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim(),
                Message = dto.Message.Trim(),
                Interest = string.IsNullOrWhiteSpace(dto.Interest) ? null : dto.Interest.Trim(),
            });
            await db.SaveChangesAsync();
        }

        return Ok(new { message = "Đã nhận yêu cầu tư vấn. Trung tâm sẽ liên hệ lại sớm." });
    }

    // ── LIST (Admin) ──────────────────────────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll([FromQuery] LeadStatus? status, [FromQuery] string? search)
    {
        var query = db.ContactLeads.Include(l => l.HandledBy).AsQueryable();

        if (status.HasValue)
            query = query.Where(l => l.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(l =>
                l.FullName.ToLower().Contains(term) ||
                l.Email.ToLower().Contains(term) ||
                (l.PhoneNumber != null && l.PhoneNumber.Contains(term)));
        }

        var leads = await query
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id, l.FullName, l.Email, l.PhoneNumber, l.Message,
                l.Interest, l.Status, l.Note, l.CreatedAt, l.HandledAt,
                l.StudentId, l.EnrollmentId,
                HandledBy = l.HandledBy == null ? null : l.HandledBy.FullName
            })
            .ToListAsync();

        return Ok(leads);
    }

    // ── COUNTS BY STATUS (Admin) ──────────────────────────────────────────────
    // Feeds the tab badges, so the admin can see there is something waiting
    // without loading every list.
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetStats()
    {
        var counts = await db.ContactLeads
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            Total = counts.Sum(c => c.Count),
            New = counts.FirstOrDefault(c => c.Status == LeadStatus.New)?.Count ?? 0,
            Contacted = counts.FirstOrDefault(c => c.Status == LeadStatus.Contacted)?.Count ?? 0,
            Enrolled = counts.FirstOrDefault(c => c.Status == LeadStatus.Enrolled)?.Count ?? 0,
            Closed = counts.FirstOrDefault(c => c.Status == LeadStatus.Closed)?.Count ?? 0,
        });
    }

    // ── UPDATE STATUS / NOTE (Admin) ──────────────────────────────────────────
    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLeadDto dto)
    {
        var lead = await db.ContactLeads.FindAsync(id);
        if (lead == null) return NotFound();

        if (dto.Status.HasValue) lead.Status = dto.Status.Value;
        if (dto.Note != null) lead.Note = dto.Note;

        lead.HandledById = CurrentUserId;
        lead.HandledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { lead.Id, lead.Status, lead.Note, lead.HandledAt });
    }

    [HttpPost("{id}/convert")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ConvertToEnrollment(int id, [FromBody] ConvertLeadDto dto)
    {
        var lead = await db.ContactLeads.FindAsync(id);
        if (lead == null) return NotFound();

        var classInfo = await db.CourseClasses.FindAsync(dto.ClassId);
        if (classInfo == null || classInfo.Status == ClassStatus.Cancelled)
            return BadRequest(new { message = "Lớp học không hợp lệ hoặc đã huỷ." });

        var email = lead.Email.Trim().ToLowerInvariant();
        var student = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        var createdAccount = false;
        string? temporaryPassword = null;
        if (student != null && student.Role != UserRole.Student)
            return Conflict(new { message = "Email của lead đang thuộc tài khoản không phải học viên." });

        if (student == null)
        {
            temporaryPassword = $"Tf!{Convert.ToBase64String(RandomNumberGenerator.GetBytes(12)).Replace('/', 'x').Replace('+', 'Y').TrimEnd('=')}";
            student = new User
            {
                FullName = lead.FullName,
                Email = email,
                PhoneNumber = lead.PhoneNumber,
                Role = UserRole.Student,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
            };
            db.Users.Add(student);
            createdAccount = true;
        }
        else if (!student.IsActive)
        {
            return Conflict(new { message = "Tài khoản học viên hiện đang bị vô hiệu hoá." });
        }

        var occupied = await db.Enrollments.CountAsync(e => e.ClassId == dto.ClassId &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (occupied >= classInfo.Capacity)
            return Conflict(new { message = "Lớp học đã đủ sĩ số." });

        await using var transaction = await db.Database.BeginTransactionAsync();
        if (createdAccount) await db.SaveChangesAsync();

        var current = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == student.Id && e.CourseId == classInfo.CourseId &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending));
        if (current != null && current.ClassId != dto.ClassId)
            return Conflict(new { message = "Học viên đã có đăng ký đang hiệu lực ở lớp khác của khoá này." });

        var enrollment = current ?? await db.Enrollments.FirstOrDefaultAsync(e =>
            e.StudentId == student.Id && e.ClassId == dto.ClassId);
        if (enrollment == null)
        {
            enrollment = new Enrollment
            {
                StudentId = student.Id, CourseId = classInfo.CourseId, ClassId = dto.ClassId,
            };
            db.Enrollments.Add(enrollment);
        }
        enrollment.Status = EnrollmentStatus.Active;
        enrollment.IsActive = true;
        enrollment.EnrolledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        lead.Status = LeadStatus.Enrolled;
        lead.StudentId = student.Id;
        lead.EnrollmentId = enrollment.Id;
        lead.HandledById = CurrentUserId;
        lead.HandledAt = DateTime.UtcNow;
        audit.Record("LeadConvertedToEnrollment", "ContactLead", lead.Id,
            new { StudentId = student.Id, EnrollmentId = enrollment.Id, ClassId = dto.ClassId, CreatedAccount = createdAccount });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            lead.Id, lead.Status, StudentId = student.Id, EnrollmentId = enrollment.Id,
            CreatedAccount = createdAccount, TemporaryPassword = temporaryPassword,
        });
    }

    // ── DELETE (Admin) ────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var lead = await db.ContactLeads.FindAsync(id);
        if (lead == null) return NotFound();

        db.ContactLeads.Remove(lead);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateLeadDto(string FullName, string Email, string? PhoneNumber, string Message, string? Interest);

public record UpdateLeadDto(LeadStatus? Status, string? Note);
public record ConvertLeadDto(int ClassId);

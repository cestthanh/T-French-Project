using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Controllers;

/// <summary>
/// Study-abroad and course enquiries from the public site.
///
/// Creation is the only anonymous write in the API — it has to be, the whole
/// point is reaching people who have no account. Everything else is admin-only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LeadsController(AppDbContext db) : ControllerBase
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
    public async Task<IActionResult> Create([FromBody] CreateLeadDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email)
            || string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Vui lòng điền họ tên, email và nội dung cần tư vấn." });

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

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
public class BookingsController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    // ── GET available slots (Student: all unbooked; Teacher: own slots) ────────
    [HttpGet]
    public async Task<IActionResult> GetSlots()
    {
        var query = db.BookingSlots
            .Include(s => s.Teacher)
            .Include(s => s.Student)
            .Include(s => s.Course)
            .AsQueryable();

        if (CurrentRole == "Teacher")
        {
            // Teacher sees only their own slots
            query = query.Where(s => s.TeacherId == CurrentUserId);
        }
        else if (CurrentRole == "Student")
        {
            // Student sees: unbooked slots + their own booked slots
            query = query.Where(s => !s.IsBooked || s.StudentId == CurrentUserId);
        }

        var result = await query
            .OrderBy(s => s.StartTime)
            .Select(s => new {
                s.Id, s.StartTime, s.EndTime, s.IsBooked, s.Notes,
                Teacher = s.Teacher!.FullName,
                TeacherId = s.TeacherId,
                Student = s.Student != null ? s.Student.FullName : null,
                StudentId = s.StudentId,
                Course = s.Course != null ? s.Course.Title : null,
                s.CourseId,
                s.CreatedAt
            })
            .ToListAsync();

        return Ok(result);
    }

    // ── CREATE slot (Teacher only) ────────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateSlot([FromBody] CreateSlotDto dto)
    {
        if (dto.StartTime >= dto.EndTime)
            return BadRequest(new { message = "Giờ bắt đầu phải trước giờ kết thúc." });
        if (dto.StartTime <= DateTime.UtcNow)
            return BadRequest(new { message = "Không thể tạo slot trong quá khứ." });

        var ownsCourse = await db.Courses.AnyAsync(c =>
            c.Id == dto.CourseId && c.TeacherId == CurrentUserId);
        if (!ownsCourse)
            return BadRequest(new { message = "Khoá học không tồn tại hoặc không thuộc giáo viên hiện tại." });

        // Check for overlapping slots for the same teacher
        var overlap = await db.BookingSlots.AnyAsync(s =>
            s.TeacherId == CurrentUserId &&
            s.StartTime < dto.EndTime &&
            s.EndTime > dto.StartTime);

        if (overlap)
            return Conflict(new { message = "Slot này bị trùng với slot khác đã tạo." });

        var slot = new BookingSlot
        {
            TeacherId = CurrentUserId,
            CourseId = dto.CourseId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
        };

        db.BookingSlots.Add(slot);
        await db.SaveChangesAsync();
        return Ok(slot);
    }

    // ── BOOK a slot (Student only) ────────────────────────────────────────────
    [HttpPost("{id}/book")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Book(int id)
    {
        var slot = await db.BookingSlots.FindAsync(id);
        if (slot == null) return NotFound();
        if (slot.IsBooked) return Conflict(new { message = "Slot này đã được đặt." });
        if (slot.StartTime <= DateTime.UtcNow)
            return Conflict(new { message = "Slot này đã bắt đầu hoặc đã qua." });

        var enrolled = await db.Enrollments.AnyAsync(e =>
            e.CourseId == slot.CourseId && e.StudentId == CurrentUserId && e.Status == EnrollmentStatus.Active);
        if (!enrolled)
            return Forbid();

        // Prevent double-booking: student can't book overlapping slots
        var studentOverlap = await db.BookingSlots.AnyAsync(s =>
            s.StudentId == CurrentUserId &&
            s.IsBooked &&
            s.StartTime < slot.EndTime &&
            s.EndTime > slot.StartTime);

        if (studentOverlap)
            return Conflict(new { message = "Bạn đã có lịch trùng giờ này." });

        // Claim the slot atomically. If another request booked it after the
        // checks above, no row is changed and this caller gets a conflict.
        var updated = await db.BookingSlots
            .Where(s => s.Id == id && !s.IsBooked)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.StudentId, CurrentUserId)
                .SetProperty(s => s.IsBooked, true));

        if (updated == 0)
            return Conflict(new { message = "Slot này vừa được người khác đặt." });

        return Ok(new { message = "Đặt lịch thành công!", slot.Id, slot.StartTime, slot.EndTime });
    }

    // ── CANCEL a booking ──────────────────────────────────────────────────────
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var slot = await db.BookingSlots.FindAsync(id);
        if (slot == null) return NotFound();

        // Student can cancel their own; Teacher/Admin can cancel any slot they own
        bool canCancel = (CurrentRole == "Student" && slot.StudentId == CurrentUserId)
                      || (CurrentRole is "Teacher" or "Admin" && slot.TeacherId == CurrentUserId)
                      || CurrentRole == "Admin";

        if (!canCancel) return Forbid();

        slot.IsBooked = false;
        slot.StudentId = null;
        await db.SaveChangesAsync();
        return Ok(new { message = "Đã huỷ lịch." });
    }

    // ── DELETE slot (Teacher/Admin) ───────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var slot = await db.BookingSlots.FindAsync(id);
        if (slot == null) return NotFound();
        if (CurrentRole == "Teacher" && slot.TeacherId != CurrentUserId) return Forbid();
        db.BookingSlots.Remove(slot);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TFrench.API.Data;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // ── GET my profile ────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();
        return Ok(new {
            user.Id, user.FullName, user.Email, user.PhoneNumber,
            Role = user.Role.ToString(), user.AvatarUrl, user.CreatedAt
        });
    }

    // ── UPDATE profile ────────────────────────────────────────────────────────
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileDto dto)
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.FullName))   user.FullName    = dto.FullName.Trim();
        if (dto.PhoneNumber != null)                     user.PhoneNumber = dto.PhoneNumber.Trim();
        if (dto.AvatarUrl   != null)                     user.AvatarUrl   = dto.AvatarUrl.Trim();

        await db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Email, user.PhoneNumber, user.AvatarUrl });
    }

    // ── CHANGE password ───────────────────────────────────────────────────────
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });

        if (dto.NewPassword.Length < 6)
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync();
        return Ok(new { message = "Đổi mật khẩu thành công!" });
    }
}

public record UpdateProfileDto(string? FullName, string? PhoneNumber, string? AvatarUrl);
public record ChangePasswordDto(string CurrentPassword, string NewPassword);

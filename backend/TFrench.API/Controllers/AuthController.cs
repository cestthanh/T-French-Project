using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;
using TFrench.API.DTOs;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || dto.FullName.Trim().Length < 2)
            return BadRequest(new { message = "Họ tên phải có ít nhất 2 ký tự." });
        if (!new EmailAddressAttribute().IsValid(dto.Email))
            return BadRequest(new { message = "Email không hợp lệ." });
        if (string.IsNullOrEmpty(dto.Password) || dto.Password.Length < 8)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 8 ký tự." });

        var result = await authService.RegisterAsync(dto);
        if (result is null)
            return Conflict(new { message = "Email đã được sử dụng." });
        return Ok(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrEmpty(dto.Password))
            return BadRequest(new { message = "Vui lòng nhập email và mật khẩu." });

        var result = await authService.LoginAsync(dto);
        if (result is null)
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });
        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        return Ok(new { userId, email, name, role });
    }
}

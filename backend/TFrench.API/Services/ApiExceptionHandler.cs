using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TFrench.API.Services;

/// <summary>
/// Last-resort conversion of unhandled exceptions to a non-sensitive API
/// response. Expected validation/authorization failures should still be
/// returned explicitly by their endpoint.
/// </summary>
public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled API exception. TraceId: {TraceId}", httpContext.TraceIdentifier);

        var status = exception is DbUpdateException
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status500InternalServerError;

        var problem = new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status409Conflict
                ? "Dữ liệu xung đột."
                : "Đã xảy ra lỗi hệ thống.",
            Detail = status == StatusCodes.Status409Conflict
                ? "Yêu cầu không thể hoàn tất do dữ liệu đã thay đổi hoặc không còn hợp lệ."
                : "Vui lòng thử lại. Nếu lỗi tiếp diễn, hãy cung cấp mã truy vết cho quản trị viên.",
            Instance = httpContext.Request.Path,
        };
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}

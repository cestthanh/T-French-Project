using Microsoft.EntityFrameworkCore;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Services;

public class QuizDeadlineWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<QuizDeadlineWorker> logger,
    IConfiguration configuration) : BackgroundService
{
    private readonly TimeSpan interval = TimeSpan.FromSeconds(
        Math.Clamp(configuration.GetValue("Quiz:DeadlineSweepSeconds", 15), 1, 300));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var grading = scope.ServiceProvider.GetRequiredService<QuizAttemptService>();
                var now = DateTime.UtcNow;
                var expired = await db.QuizAttempts
                    .Include(a => a.Quiz).ThenInclude(q => q!.Questions).ThenInclude(q => q.Options)
                    .Include(a => a.Answers)
                    .Where(a => a.Status == QuizAttemptStatus.InProgress && a.Deadline <= now)
                    .OrderBy(a => a.Deadline)
                    .Take(100)
                    .ToListAsync(stoppingToken);

                foreach (var attempt in expired)
                    await grading.FinalizeAsync(attempt, attempt.Deadline);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Failed to finalize expired quiz attempts.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}

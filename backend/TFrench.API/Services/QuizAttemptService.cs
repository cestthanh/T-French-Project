using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TFrench.API.Data;
using TFrench.API.Models;

namespace TFrench.API.Services;

public class QuizAttemptService(AppDbContext db)
{
    public async Task FinalizeAsync(QuizAttempt attempt, DateTime? submittedAt = null)
    {
        if (attempt.Status != QuizAttemptStatus.InProgress) return;

        var total = 0m;
        var pendingEssay = false;
        foreach (var question in attempt.Quiz!.Questions)
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
            if (question.Type == QuizQuestionType.Essay)
            {
                if (answer != null && !string.IsNullOrWhiteSpace(answer.TextAnswer))
                {
                    if (answer.ManualScore.HasValue) total += answer.ManualScore.Value;
                    else pendingEssay = true;
                }
                continue;
            }

            var selected = answer == null ? [] : ParseIds(answer.SelectedOptionIdsJson);
            var correct = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).Order().ToArray();
            var earned = selected.Order().SequenceEqual(correct) ? question.Points : 0m;
            if (answer != null) answer.AutoScore = earned;
            total += earned;
        }

        attempt.SubmittedAt ??= submittedAt ?? DateTime.UtcNow;
        attempt.Status = pendingEssay ? QuizAttemptStatus.PendingGrading : QuizAttemptStatus.Graded;
        attempt.Score = pendingEssay ? null : total;
        await db.SaveChangesAsync();
    }

    public async Task RecalculateAfterManualGradingAsync(int attemptId)
    {
        var attempt = await db.QuizAttempts
            .Include(a => a.Answers).ThenInclude(a => a.Question)
            .FirstAsync(a => a.Id == attemptId);
        var essayPending = attempt.Answers.Any(a =>
            a.Question!.Type == QuizQuestionType.Essay &&
            !string.IsNullOrWhiteSpace(a.TextAnswer) && !a.ManualScore.HasValue);
        if (essayPending) return;

        attempt.Score = attempt.Answers.Sum(a => a.AutoScore ?? a.ManualScore ?? 0m);
        attempt.Status = QuizAttemptStatus.Graded;
        await db.SaveChangesAsync();
    }

    private static int[] ParseIds(string value)
    {
        try { return JsonSerializer.Deserialize<int[]>(value) ?? []; }
        catch (JsonException) { return []; }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using TFrench.API.Data;
using TFrench.API.Models;
using TFrench.API.Services;

namespace TFrench.API.Controllers;

[ApiController]
[Route("api/quizzes")]
[Authorize]
public class QuizzesController(
    AppDbContext db,
    AuditService audit,
    QuizAttemptService attemptService) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentRole => User.FindFirst(ClaimTypes.Role)!.Value;

    [HttpGet("manage")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetManaged()
    {
        var query = db.Quizzes.AsQueryable();
        if (CurrentRole == "Teacher")
            query = query.Where(q => q.Class!.TeacherId == CurrentUserId);

        var rows = await query.OrderByDescending(q => q.CreatedAt).Select(q => new
        {
            q.Id, q.Title, q.IsPublished, q.OpenAt, q.CloseAt, q.DurationMinutes,
            q.ClassId, ClassName = q.Class!.Name, q.CourseId, Course = q.Course!.Title,
            QuestionCount = q.Questions.Count,
            TotalPoints = q.Questions.Sum(x => (double)x.Points),
            AttemptCount = q.Attempts.Count,
            PendingGrading = q.Attempts.Count(a => a.Status == QuizAttemptStatus.PendingGrading),
        }).ToListAsync();
        return Ok(rows);
    }

    [HttpGet("manage/{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetManagedDetail(int id)
    {
        var quiz = await db.Quizzes
            .Include(q => q.Class)
            .Include(q => q.Questions.OrderBy(x => x.Order)).ThenInclude(x => x.Options.OrderBy(o => o.Order))
            .FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return NotFound();
        if (!CanManage(quiz)) return Forbid();

        return Ok(new
        {
            quiz.Id, quiz.Title, quiz.Description, quiz.ClassId, quiz.CourseId,
            quiz.OpenAt, quiz.CloseAt, quiz.DurationMinutes, quiz.MaxAttempts,
            quiz.IsPublished, quiz.ShowAnswersAfterGrading,
            Questions = quiz.Questions.Select(q => new
            {
                q.Id, q.Type, q.Content, q.Points, q.Order, q.Explanation, q.Rubric,
                Options = q.Options.Select(o => new { o.Id, o.Text, o.IsCorrect, o.Order })
            })
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] SaveQuizDto dto)
    {
        var validation = await ValidateQuizAsync(dto);
        if (validation != null) return validation;

        var classInfo = await db.CourseClasses.FindAsync(dto.ClassId);
        var quiz = new Quiz
        {
            Title = dto.Title.Trim(), Description = Clean(dto.Description),
            ClassId = dto.ClassId, CourseId = classInfo!.CourseId, CreatedById = CurrentUserId,
            OpenAt = dto.OpenAt.ToUniversalTime(), CloseAt = dto.CloseAt.ToUniversalTime(),
            DurationMinutes = dto.DurationMinutes, MaxAttempts = 1,
            ShowAnswersAfterGrading = dto.ShowAnswersAfterGrading,
            Questions = BuildQuestions(dto.Questions),
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();
        return Ok(new { quiz.Id, quiz.Title, quiz.IsPublished });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveQuizDto dto)
    {
        var quiz = await db.Quizzes.Include(q => q.Class)
            .Include(q => q.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return NotFound();
        if (!CanManage(quiz)) return Forbid();
        if (quiz.IsPublished || await db.QuizAttempts.AnyAsync(a => a.QuizId == id))
            return Conflict(new { message = "Không thể sửa cấu trúc đề đã publish hoặc đã có lượt làm." });

        var validation = await ValidateQuizAsync(dto);
        if (validation != null) return validation;
        var classInfo = await db.CourseClasses.FindAsync(dto.ClassId);

        db.QuizQuestions.RemoveRange(quiz.Questions);
        quiz.Title = dto.Title.Trim();
        quiz.Description = Clean(dto.Description);
        quiz.ClassId = dto.ClassId;
        quiz.CourseId = classInfo!.CourseId;
        quiz.OpenAt = dto.OpenAt.ToUniversalTime();
        quiz.CloseAt = dto.CloseAt.ToUniversalTime();
        quiz.DurationMinutes = dto.DurationMinutes;
        quiz.ShowAnswersAfterGrading = dto.ShowAnswersAfterGrading;
        quiz.Questions = BuildQuestions(dto.Questions);
        quiz.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { quiz.Id, quiz.Title });
    }

    [HttpPatch("{id}/publish")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> TogglePublish(int id)
    {
        var quiz = await db.Quizzes.Include(q => q.Class)
            .Include(q => q.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return NotFound();
        if (!CanManage(quiz)) return Forbid();

        if (!quiz.IsPublished)
        {
            var error = ValidatePublish(quiz);
            if (error != null) return BadRequest(new { message = error });
        }
        else if (await db.QuizAttempts.AnyAsync(a =>
                     a.QuizId == id && a.Status == QuizAttemptStatus.InProgress))
        {
            return Conflict(new { message = "Không thể ẩn đề khi đang có học viên làm bài." });
        }
        quiz.IsPublished = !quiz.IsPublished;
        quiz.UpdatedAt = DateTime.UtcNow;
        audit.Record(quiz.IsPublished ? "QuizPublished" : "QuizUnpublished", "Quiz", quiz.Id);
        await db.SaveChangesAsync();
        return Ok(new { quiz.Id, quiz.IsPublished });
    }

    [HttpGet("available")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetAvailable()
    {
        var now = DateTime.UtcNow;
        var rows = await db.Quizzes
            .Where(q => q.Class!.Enrollments.Any(e => e.StudentId == CurrentUserId && e.Status == EnrollmentStatus.Active) &&
                ((q.IsPublished && q.OpenAt <= now && q.CloseAt >= now) ||
                 q.Attempts.Any(a => a.StudentId == CurrentUserId)))
            .OrderBy(q => q.CloseAt)
            .Select(q => new
            {
                q.Id, q.Title, q.Description, q.OpenAt, q.CloseAt, q.DurationMinutes,
                ClassName = q.Class!.Name, Course = q.Course!.Title,
                QuestionCount = q.Questions.Count,
                TotalPoints = q.Questions.Sum(x => (double)x.Points),
                Attempt = q.Attempts.Where(a => a.StudentId == CurrentUserId)
                    .Select(a => new { a.Id, a.Status, a.Score, a.Deadline }).FirstOrDefault(),
            }).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("{id}/start")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Start(int id)
    {
        var now = DateTime.UtcNow;
        var quiz = await db.Quizzes.Include(q => q.Class)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return NotFound();
        if (!await db.Enrollments.AnyAsync(e => e.ClassId == quiz.ClassId &&
                e.StudentId == CurrentUserId && e.Status == EnrollmentStatus.Active))
            return Forbid();

        var existing = await db.QuizAttempts.FirstOrDefaultAsync(a =>
            a.QuizId == id && a.StudentId == CurrentUserId);
        if (existing != null)
            return Ok(new { existing.Id, existing.Status, existing.Deadline, existing.Version });

        if (!quiz.IsPublished) return NotFound();
        if (now < quiz.OpenAt || now > quiz.CloseAt)
            return Conflict(new { message = "Bài test chưa mở hoặc đã đóng." });

        var attempt = new QuizAttempt
        {
            QuizId = id, StudentId = CurrentUserId, StartedAt = now,
            Deadline = new[] { now.AddMinutes(quiz.DurationMinutes), quiz.CloseAt }.Min(),
        };
        db.QuizAttempts.Add(attempt);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            attempt = await db.QuizAttempts.SingleAsync(a =>
                a.QuizId == id && a.StudentId == CurrentUserId);
        }
        return Ok(new { attempt.Id, attempt.Status, attempt.Deadline, attempt.Version });
    }

    [HttpGet("attempts/{id}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetAttempt(int id)
    {
        var attempt = await db.QuizAttempts
            .Include(a => a.Quiz).ThenInclude(q => q!.Questions.OrderBy(x => x.Order)).ThenInclude(x => x.Options.OrderBy(o => o.Order))
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == CurrentUserId);
        if (attempt == null) return NotFound();
        if (attempt.Status == QuizAttemptStatus.InProgress && DateTime.UtcNow >= attempt.Deadline)
            await attemptService.FinalizeAsync(attempt, attempt.Deadline);

        var quiz = attempt.Quiz!;
        var canReview = attempt.Status == QuizAttemptStatus.Graded && quiz.ShowAnswersAfterGrading;
        return Ok(new
        {
            attempt.Id, attempt.Status, attempt.StartedAt, attempt.Deadline, attempt.SubmittedAt,
            attempt.Score, attempt.Version,
            Quiz = new
            {
                quiz.Id, quiz.Title, quiz.Description,
                TotalPoints = quiz.Questions.Sum(q => q.Points),
            },
            Questions = quiz.Questions.Select(q => new
            {
                q.Id, q.Type, q.Content, q.Points, q.Order,
                Explanation = canReview ? q.Explanation : null,
                Options = q.Options.Select(o => new
                {
                    o.Id, o.Text, o.Order,
                    IsCorrect = canReview ? o.IsCorrect : (bool?)null,
                }),
                Answer = attempt.Answers.Where(a => a.QuestionId == q.Id).Select(a => new
                {
                    a.Id, a.TextAnswer,
                    SelectedOptionIds = ParseIds(a.SelectedOptionIdsJson),
                    Score = a.ManualScore ?? a.AutoScore,
                    a.Feedback,
                }).FirstOrDefault()
            })
        });
    }

    [HttpPut("attempts/{id}/answers")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SaveAnswers(int id, [FromBody] SaveAttemptAnswersDto dto)
    {
        var attempt = await db.QuizAttempts.Include(a => a.Quiz).ThenInclude(q => q!.Questions)
            .ThenInclude(q => q.Options).Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == CurrentUserId);
        if (attempt == null) return NotFound();
        if (attempt.Status != QuizAttemptStatus.InProgress)
            return Conflict(new { message = "Lượt làm đã được nộp.", currentVersion = attempt.Version });
        if (DateTime.UtcNow >= attempt.Deadline)
        {
            await attemptService.FinalizeAsync(attempt, attempt.Deadline);
            return Conflict(new { message = "Đã hết thời gian làm bài.", currentVersion = attempt.Version });
        }
        if (dto.Version != attempt.Version)
            return Conflict(new { message = "Đáp án đã được cập nhật ở tab khác.", currentVersion = attempt.Version });

        var validationMessage = ValidateAnswers(attempt.Quiz!, dto.Answers);
        if (validationMessage != null) return BadRequest(new { message = validationMessage });

        await using var transaction = await db.Database.BeginTransactionAsync();
        var updated = await db.QuizAttempts.Where(a => a.Id == id && a.Version == dto.Version &&
                a.Status == QuizAttemptStatus.InProgress)
            .ExecuteUpdateAsync(setters => setters.SetProperty(a => a.Version, a => a.Version + 1));
        if (updated == 0)
        {
            await transaction.RollbackAsync();
            return Conflict(new { message = "Đáp án đã được cập nhật ở tab khác." });
        }

        foreach (var incoming in dto.Answers)
        {
            var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == incoming.QuestionId);
            if (answer == null)
            {
                answer = new AttemptAnswer { AttemptId = id, QuestionId = incoming.QuestionId };
                db.AttemptAnswers.Add(answer);
            }
            answer.TextAnswer = Clean(incoming.TextAnswer);
            answer.SelectedOptionIdsJson = JsonSerializer.Serialize(incoming.SelectedOptionIds.Distinct().Order().ToArray());
            answer.SavedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { version = dto.Version + 1, savedAt = DateTime.UtcNow });
    }

    [HttpPost("attempts/{id}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Submit(int id)
    {
        var attempt = await db.QuizAttempts
            .Include(a => a.Quiz).ThenInclude(q => q!.Questions).ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == CurrentUserId);
        if (attempt == null) return NotFound();
        if (attempt.Status == QuizAttemptStatus.InProgress)
            await attemptService.FinalizeAsync(attempt);
        return Ok(new { attempt.Id, attempt.Status, attempt.Score, attempt.SubmittedAt });
    }

    [HttpGet("{id}/results")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetResults(int id)
    {
        var quiz = await db.Quizzes.Include(q => q.Class).FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return NotFound();
        if (!CanManage(quiz)) return Forbid();

        var rows = await db.QuizAttempts.Where(a => a.QuizId == id)
            .OrderByDescending(a => a.StartedAt).Select(a => new
            {
                a.Id, a.StudentId, Student = a.Student!.FullName, a.Student.Email,
                a.Status, a.Score, a.StartedAt, a.SubmittedAt,
                EssayAnswers = a.Answers.Where(x => x.Question!.Type == QuizQuestionType.Essay)
                    .OrderBy(x => x.Question!.Order).Select(x => new
                    {
                        x.Id, x.QuestionId, Question = x.Question!.Content, x.Question.Points,
                        x.TextAnswer, x.ManualScore, x.Feedback,
                    })
            }).ToListAsync();
        return Ok(rows);
    }

    [HttpPatch("answers/{answerId}/grade")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GradeEssay(int answerId, [FromBody] GradeQuizAnswerDto dto)
    {
        var answer = await db.AttemptAnswers
            .Include(a => a.Question)
            .Include(a => a.Attempt).ThenInclude(a => a!.Quiz).ThenInclude(q => q!.Class)
            .FirstOrDefaultAsync(a => a.Id == answerId);
        if (answer == null) return NotFound();
        if (!CanManage(answer.Attempt!.Quiz!)) return Forbid();
        if (answer.Question!.Type != QuizQuestionType.Essay)
            return BadRequest(new { message = "Chỉ câu tự luận mới được chấm thủ công." });
        if (dto.Score < 0 || dto.Score > answer.Question.Points)
            return BadRequest(new { message = $"Điểm phải nằm trong khoảng 0–{answer.Question.Points}." });

        answer.ManualScore = dto.Score;
        answer.Feedback = Clean(dto.Feedback);
        answer.GradedAt = DateTime.UtcNow;
        answer.GradedById = CurrentUserId;
        audit.Record("QuizEssayGraded", "AttemptAnswer", answer.Id,
            new { answer.AttemptId, Score = dto.Score, MaxScore = answer.Question.Points });
        await db.SaveChangesAsync();

        await attemptService.RecalculateAfterManualGradingAsync(answer.AttemptId);
        return Ok(new { answer.Id, answer.ManualScore, answer.Feedback });
    }

    private bool CanManage(Quiz quiz) =>
        CurrentRole == "Admin" || quiz.Class?.TeacherId == CurrentUserId;

    private async Task<IActionResult?> ValidateQuizAsync(SaveQuizDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tên bài test phải có từ 1 đến 200 ký tự." });
        if (dto.Description?.Length > 4000)
            return BadRequest(new { message = "Mô tả không được vượt quá 4.000 ký tự." });
        if (dto.DurationMinutes is < 1 or > 480)
            return BadRequest(new { message = "Thời lượng phải nằm trong khoảng 1–480 phút." });
        if (dto.CloseAt <= dto.OpenAt)
            return BadRequest(new { message = "Thời gian đóng phải sau thời gian mở." });
        if (dto.Questions.Count is < 1 or > 200)
            return BadRequest(new { message = "Bài test phải có từ 1 đến 200 câu hỏi." });

        var classInfo = await db.CourseClasses.FindAsync(dto.ClassId);
        if (classInfo == null) return BadRequest(new { message = "Lớp học không tồn tại." });
        if (CurrentRole == "Teacher" && classInfo.TeacherId != CurrentUserId) return Forbid();

        for (var index = 0; index < dto.Questions.Count; index++)
        {
            var q = dto.Questions[index];
            if (string.IsNullOrWhiteSpace(q.Content) || q.Content.Trim().Length > 4000)
                return BadRequest(new { message = $"Nội dung câu {index + 1} không hợp lệ." });
            if (q.Points <= 0 || q.Points > 1000)
                return BadRequest(new { message = $"Điểm câu {index + 1} phải lớn hơn 0 và không quá 1.000." });
            if (q.Type != QuizQuestionType.Essay)
            {
                if (q.Options.Count is < 2 or > 20 || q.Options.Any(o => string.IsNullOrWhiteSpace(o.Text)))
                    return BadRequest(new { message = $"Câu {index + 1} phải có từ 2 đến 20 lựa chọn hợp lệ." });
                var correctCount = q.Options.Count(o => o.IsCorrect);
                if (q.Type == QuizQuestionType.SingleChoice && correctCount != 1)
                    return BadRequest(new { message = $"Câu {index + 1} phải có đúng một đáp án đúng." });
                if (q.Type == QuizQuestionType.MultipleChoice && correctCount < 1)
                    return BadRequest(new { message = $"Câu {index + 1} phải có ít nhất một đáp án đúng." });
            }
        }
        if (dto.Questions.Sum(q => q.Points) > 10_000m)
            return BadRequest(new { message = "Tổng điểm của bài test không được vượt quá 10.000." });
        return null;
    }

    private static string? ValidatePublish(Quiz quiz)
    {
        if (quiz.Questions.Count == 0) return "Đề chưa có câu hỏi.";
        if (quiz.Questions.Sum(q => q.Points) <= 0)
            return "Tổng điểm của đề phải lớn hơn 0.";
        if (quiz.CloseAt <= quiz.OpenAt) return "Thời gian đóng phải sau thời gian mở.";
        return null;
    }

    private static List<QuizQuestion> BuildQuestions(IReadOnlyList<SaveQuizQuestionDto> rows) =>
        rows.Select((q, index) => new QuizQuestion
        {
            Type = q.Type, Content = q.Content.Trim(), Points = q.Points, Order = index,
            Explanation = Clean(q.Explanation), Rubric = Clean(q.Rubric),
            Options = q.Type == QuizQuestionType.Essay ? [] : q.Options.Select((o, optionIndex) =>
                new QuestionOption { Text = o.Text.Trim(), IsCorrect = o.IsCorrect, Order = optionIndex }).ToList(),
        }).ToList();

    private static string? ValidateAnswers(Quiz quiz, IReadOnlyList<SaveAnswerDto> answers)
    {
        if (answers.Select(a => a.QuestionId).Distinct().Count() != answers.Count)
            return "Mỗi câu hỏi chỉ được gửi một đáp án.";
        foreach (var answer in answers)
        {
            var question = quiz.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
            if (question == null) return "Đáp án chứa câu hỏi không thuộc bài test.";
            var selected = answer.SelectedOptionIds.Distinct().ToArray();
            if (selected.Any(id => question.Options.All(o => o.Id != id)))
                return "Đáp án chứa lựa chọn không thuộc câu hỏi.";
            if (question.Type == QuizQuestionType.SingleChoice && selected.Length > 1)
                return "Câu một đáp án chỉ được chọn một lựa chọn.";
            if (question.Type == QuizQuestionType.Essay && selected.Length > 0)
                return "Câu tự luận không nhận lựa chọn trắc nghiệm.";
            if (answer.TextAnswer?.Length > 20_000)
                return "Câu trả lời tự luận không được vượt quá 20.000 ký tự.";
        }
        return null;
    }

    private static int[] ParseIds(string value)
    {
        try { return JsonSerializer.Deserialize<int[]>(value) ?? []; }
        catch (JsonException) { return []; }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record SaveQuizDto(
    string Title, string? Description, int ClassId, DateTime OpenAt, DateTime CloseAt,
    int DurationMinutes, bool ShowAnswersAfterGrading, List<SaveQuizQuestionDto> Questions);
public record SaveQuizQuestionDto(
    QuizQuestionType Type, string Content, decimal Points, string? Explanation,
    string? Rubric, List<SaveQuestionOptionDto> Options);
public record SaveQuestionOptionDto(string Text, bool IsCorrect);
public record SaveAttemptAnswersDto(int Version, List<SaveAnswerDto> Answers);
public record SaveAnswerDto(int QuestionId, string? TextAnswer, List<int> SelectedOptionIds);
public record GradeQuizAnswerDto(decimal Score, string? Feedback);

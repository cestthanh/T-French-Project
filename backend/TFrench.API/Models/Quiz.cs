using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

public enum QuizQuestionType { SingleChoice, MultipleChoice, Essay }
public enum QuizAttemptStatus { InProgress, Submitted, PendingGrading, Graded, Expired }

public class Quiz
{
    public int Id { get; set; }
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(4000)] public string? Description { get; set; }
    public int CourseId { get; set; }
    public Course? Course { get; set; }
    public int ClassId { get; set; }
    public CourseClass? Class { get; set; }
    public int CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public DateTime OpenAt { get; set; }
    public DateTime CloseAt { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public int MaxAttempts { get; set; } = 1;
    public bool IsPublished { get; set; }
    public bool ShowAnswersAfterGrading { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<QuizQuestion> Questions { get; set; } = [];
    public ICollection<QuizAttempt> Attempts { get; set; } = [];
}

public class QuizQuestion
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public Quiz? Quiz { get; set; }
    public QuizQuestionType Type { get; set; }
    [Required, MaxLength(4000)] public string Content { get; set; } = string.Empty;
    public decimal Points { get; set; }
    public int Order { get; set; }
    [MaxLength(4000)] public string? Explanation { get; set; }
    [MaxLength(4000)] public string? Rubric { get; set; }
    public ICollection<QuestionOption> Options { get; set; } = [];
    public ICollection<AttemptAnswer> Answers { get; set; } = [];
}

public class QuestionOption
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public QuizQuestion? Question { get; set; }
    [Required, MaxLength(2000)] public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int Order { get; set; }
}

public class QuizAttempt
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public Quiz? Quiz { get; set; }
    public int StudentId { get; set; }
    public User? Student { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime Deadline { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public QuizAttemptStatus Status { get; set; } = QuizAttemptStatus.InProgress;
    public decimal? Score { get; set; }
    public int Version { get; set; }
    public ICollection<AttemptAnswer> Answers { get; set; } = [];
}

public class AttemptAnswer
{
    public int Id { get; set; }
    public int AttemptId { get; set; }
    public QuizAttempt? Attempt { get; set; }
    public int QuestionId { get; set; }
    public QuizQuestion? Question { get; set; }
    public string? TextAnswer { get; set; }
    public string SelectedOptionIdsJson { get; set; } = "[]";
    public decimal? AutoScore { get; set; }
    public decimal? ManualScore { get; set; }
    [MaxLength(4000)] public string? Feedback { get; set; }
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    public DateTime? GradedAt { get; set; }
    public int? GradedById { get; set; }
    public User? GradedBy { get; set; }
}

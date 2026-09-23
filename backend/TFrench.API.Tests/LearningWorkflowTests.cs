using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TFrench.API.Data;
using TFrench.API.Models;
using Xunit;

namespace TFrench.API.Tests;

public sealed class LearningWorkflowTests
{
    [Fact]
    public async Task HealthEndpoint_ReturnsHealthyWhenDatabaseIsAvailable()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health");
        var payload = await ReadJsonAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("healthy", payload.GetProperty("status").GetString());
    }

    [Fact]
    public async Task QuizDeadlineWorker_FinalizesAttemptWithoutBrowserRequest()
    {
        // Arrange — create a published objective-only quiz and start one attempt.
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacherToken = await LoginAsync(client, "teacher@tfrench.vn", "Teacher@123");
        var studentToken = await RegisterAsync(client, UniqueEmail("deadline"));
        var course = await GetJsonAsync(client, "/api/courses/1");
        var classId = course.GetProperty("classes")[0].GetProperty("id").GetInt32();
        Authorize(client, studentToken);
        await client.PostAsJsonAsync("/api/courses/1/enroll", new { classId });
        Authorize(client, teacherToken);
        var quiz = await ReadJsonAsync(await client.PostAsJsonAsync("/api/quizzes", new
        {
            title = "Deadline worker quiz", classId,
            openAt = DateTime.UtcNow.AddMinutes(-1), closeAt = DateTime.UtcNow.AddHours(1),
            durationMinutes = 30, showAnswersAfterGrading = false,
            questions = new[]
            {
                new
                {
                    type = "SingleChoice", content = "One", points = 10,
                    explanation = (string?)null, rubric = (string?)null,
                    options = new[] { new { text = "A", isCorrect = true }, new { text = "B", isCorrect = false } },
                },
            },
        }));
        var quizId = quiz.GetProperty("id").GetInt32();
        await client.PatchAsync($"/api/quizzes/{quizId}/publish", JsonContent.Create(new { }));
        Authorize(client, studentToken);
        var started = await ReadJsonAsync(await client.PostAsJsonAsync($"/api/quizzes/{quizId}/start", new { }));
        var attemptId = started.GetProperty("id").GetInt32();

        // Act — expire the attempt in storage and make no further HTTP request.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var attempt = await db.QuizAttempts.FindAsync(attemptId);
            attempt!.Deadline = DateTime.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();
        }

        QuizAttemptStatus status = QuizAttemptStatus.InProgress;
        for (var index = 0; index < 30 && status == QuizAttemptStatus.InProgress; index++)
        {
            await Task.Delay(100);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            status = await db.QuizAttempts.AsNoTracking()
                .Where(a => a.Id == attemptId).Select(a => a.Status).SingleAsync();
        }

        // Assert — the server worker submitted/graded it without help from the browser.
        Assert.Equal(QuizAttemptStatus.Graded, status);
    }

    [Fact]
    public async Task EnrollmentWorkflow_FreeActivates_PaidWaitsForAdminApproval()
    {
        // Arrange — start an isolated API/database and authenticate the admin.
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var adminToken = await LoginAsync(client, "admin@tfrench.vn", "Admin@123");
        var teacherId = 2;

        var freeCourse = await GetJsonAsync(client, "/api/courses/1");
        var freeClassId = freeCourse.GetProperty("classes")[0].GetProperty("id").GetInt32();
        var freeToken = await RegisterAsync(client, UniqueEmail("free"));

        // Act — self-enrol in the seeded free course.
        Authorize(client, freeToken);
        var freeResponse = await client.PostAsJsonAsync("/api/courses/1/enroll", new { classId = freeClassId });
        var freeResult = await ReadJsonAsync(freeResponse);

        // Assert — free courses become active immediately.
        Assert.Equal(HttpStatusCode.OK, freeResponse.StatusCode);
        Assert.Equal("Active", freeResult.GetProperty("status").GetString());

        // Arrange a paid course and open class as admin.
        Authorize(client, adminToken);
        var paidCourseResponse = await client.PostAsJsonAsync("/api/courses", new
        {
            title = $"Paid integration {Guid.NewGuid():N}", price = 500_000, teacherId,
        });
        var paidCourse = await ReadJsonAsync(paidCourseResponse);
        var paidCourseId = paidCourse.GetProperty("id").GetInt32();
        await client.PatchAsync($"/api/courses/{paidCourseId}/publish", JsonContent.Create(new { }));

        var paidClassResponse = await client.PostAsJsonAsync("/api/classes", new
        {
            name = "Paid class", courseId = paidCourseId, teacherId,
            startDate = DateTime.UtcNow.AddDays(1), endDate = DateTime.UtcNow.AddMonths(1),
            capacity = 10, modality = "Online", status = "Open",
            scheduleSummary = "Tuesday 19:00",
        });
        var paidClass = await ReadJsonAsync(paidClassResponse);
        var paidClassId = paidClass.GetProperty("id").GetInt32();
        var paidToken = await RegisterAsync(client, UniqueEmail("paid"));

        // Act — a student requests the paid class, then admin approves it.
        Authorize(client, paidToken);
        var pendingResponse = await client.PostAsJsonAsync($"/api/courses/{paidCourseId}/enroll", new { classId = paidClassId });
        var pending = await ReadJsonAsync(pendingResponse);
        Authorize(client, adminToken);
        var enrollments = await GetJsonAsync(client, $"/api/classes/{paidClassId}/enrollments");
        var enrollmentId = enrollments[0].GetProperty("id").GetInt32();
        var approvalResponse = await client.PatchAsync($"/api/classes/enrollments/{enrollmentId}/status",
            JsonContent.Create(new { status = "Active" }));
        var approval = await ReadJsonAsync(approvalResponse);

        // Assert — paid enrollment is pending until an admin explicitly activates it.
        Assert.Equal("Pending", pending.GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.OK, approvalResponse.StatusCode);
        Assert.Equal("Active", approval.GetProperty("status").GetString());

        // Arrange/Act — convert a public lead directly into an account + class enrollment.
        var leadEmail = UniqueEmail("lead");
        client.DefaultRequestHeaders.Authorization = null;
        var leadResponse = await client.PostAsJsonAsync("/api/leads", new
        {
            fullName = "Lead Student", email = leadEmail, phoneNumber = "0900000000",
            message = "Tôi muốn đăng ký học", interest = "A1",
        });
        Assert.Equal(HttpStatusCode.OK, leadResponse.StatusCode);
        Authorize(client, adminToken);
        var leads = await GetJsonAsync(client, "/api/leads");
        var leadId = leads.EnumerateArray().Single(x => x.GetProperty("email").GetString() == leadEmail)
            .GetProperty("id").GetInt32();
        var converted = await ReadJsonAsync(await client.PostAsJsonAsync($"/api/leads/{leadId}/convert", new { classId = freeClassId }));

        // Assert — conversion is traceable and the one-time credential really works.
        Assert.True(converted.GetProperty("createdAccount").GetBoolean());
        Assert.Equal("Enrolled", converted.GetProperty("status").GetString());
        var temporaryPassword = converted.GetProperty("temporaryPassword").GetString();
        Assert.False(string.IsNullOrWhiteSpace(temporaryPassword));
        Assert.False(string.IsNullOrWhiteSpace(await LoginAsync(client, leadEmail, temporaryPassword!)));

        Authorize(client, adminToken);
        var audit = await GetJsonAsync(client, "/api/admin/audit?action=LeadConvertedToEnrollment");
        Assert.Contains(audit.EnumerateArray(), x =>
            x.GetProperty("entityId").GetString() == leadId.ToString());
    }

    [Fact]
    public async Task QuizWorkflow_HidesAnswers_AutosavesOnce_Autogrades_ThenQueuesEssay()
    {
        // Arrange — register and enrol a fresh student in the seeded class.
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacherToken = await LoginAsync(client, "teacher@tfrench.vn", "Teacher@123");
        var studentToken = await RegisterAsync(client, UniqueEmail("quiz"));
        var course = await GetJsonAsync(client, "/api/courses/1");
        var classId = course.GetProperty("classes")[0].GetProperty("id").GetInt32();
        Authorize(client, studentToken);
        await client.PostAsJsonAsync("/api/courses/1/enroll", new { classId });

        // Arrange — teacher creates a 10-point mixed-format quiz and publishes it.
        Authorize(client, teacherToken);
        var quizResponse = await client.PostAsJsonAsync("/api/quizzes", new
        {
            title = "Mixed integration quiz", description = "single, multiple, essay", classId,
            openAt = DateTime.UtcNow.AddMinutes(-1), closeAt = DateTime.UtcNow.AddHours(1),
            durationMinutes = 30, showAnswersAfterGrading = true,
            questions = new object[]
            {
                new { type = "SingleChoice", content = "Single", points = 5, explanation = "A", rubric = (string?)null,
                    options = new[] { new { text = "A", isCorrect = true }, new { text = "B", isCorrect = false } } },
                new { type = "MultipleChoice", content = "Multiple", points = 5, explanation = "A+C", rubric = (string?)null,
                    options = new[] { new { text = "A", isCorrect = true }, new { text = "B", isCorrect = false }, new { text = "C", isCorrect = true } } },
                new { type = "Essay", content = "Essay", points = 7, explanation = (string?)null, rubric = "Clear answer",
                    options = Array.Empty<object>() },
            },
        });
        var quiz = await ReadJsonAsync(quizResponse);
        var quizId = quiz.GetProperty("id").GetInt32();
        await client.PatchAsync($"/api/quizzes/{quizId}/publish", JsonContent.Create(new { }));
        var managed = await GetJsonAsync(client, "/api/quizzes/manage");
        var managedQuiz = managed.EnumerateArray().Single(x => x.GetProperty("id").GetInt32() == quizId);
        Assert.Equal(17d, managedQuiz.GetProperty("totalPoints").GetDouble());

        // Act — student starts twice (idempotent), loads the paper and saves correct answers.
        Authorize(client, studentToken);
        var available = await GetJsonAsync(client, "/api/quizzes/available");
        var availableQuiz = available.EnumerateArray().Single(x => x.GetProperty("id").GetInt32() == quizId);
        Assert.Equal(17d, availableQuiz.GetProperty("totalPoints").GetDouble());
        var startResponses = await Task.WhenAll(
            client.PostAsJsonAsync($"/api/quizzes/{quizId}/start", new { }),
            client.PostAsJsonAsync($"/api/quizzes/{quizId}/start", new { }));
        var firstStart = await ReadJsonAsync(startResponses[0]);
        var secondStart = await ReadJsonAsync(startResponses[1]);
        var attemptId = firstStart.GetProperty("id").GetInt32();
        Assert.Equal(attemptId, secondStart.GetProperty("id").GetInt32());

        var paperResponse = await client.GetAsync($"/api/quizzes/attempts/{attemptId}");
        var paperText = await paperResponse.Content.ReadAsStringAsync();
        var paper = JsonDocument.Parse(paperText).RootElement;
        Assert.DoesNotContain("\"isCorrect\":true", paperText, StringComparison.OrdinalIgnoreCase);

        var questions = paper.GetProperty("questions");
        var q1 = questions[0]; var q2 = questions[1]; var q3 = questions[2];
        var answers = new object[]
        {
            new { questionId = q1.GetProperty("id").GetInt32(), textAnswer = (string?)null,
                selectedOptionIds = new[] { q1.GetProperty("options")[0].GetProperty("id").GetInt32() } },
            new { questionId = q2.GetProperty("id").GetInt32(), textAnswer = (string?)null,
                selectedOptionIds = new[] { q2.GetProperty("options")[0].GetProperty("id").GetInt32(), q2.GetProperty("options")[2].GetProperty("id").GetInt32() } },
            new { questionId = q3.GetProperty("id").GetInt32(), textAnswer = "Bonjour.", selectedOptionIds = Array.Empty<int>() },
        };
        var saveResponse = await client.PutAsJsonAsync($"/api/quizzes/attempts/{attemptId}/answers", new { version = 0, answers });
        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        var staleSave = await client.PutAsJsonAsync($"/api/quizzes/attempts/{attemptId}/answers", new { version = 0, answers });
        Assert.Equal(HttpStatusCode.Conflict, staleSave.StatusCode);

        var submitted = await ReadJsonAsync(await client.PostAsJsonAsync($"/api/quizzes/attempts/{attemptId}/submit", new { }));
        Assert.Equal("PendingGrading", submitted.GetProperty("status").GetString());

        // Act — teacher grades the essay.
        Authorize(client, teacherToken);
        var results = await GetJsonAsync(client, $"/api/quizzes/{quizId}/results");
        var essayAnswerId = results[0].GetProperty("essayAnswers")[0].GetProperty("id").GetInt32();
        var gradeResponse = await client.PatchAsync($"/api/quizzes/answers/{essayAnswerId}/grade",
            JsonContent.Create(new { score = 7, feedback = "Tốt" }));
        Assert.Equal(HttpStatusCode.OK, gradeResponse.StatusCode);

        // Assert — objective questions plus essay support a teacher-defined total score.
        Authorize(client, studentToken);
        var final = await GetJsonAsync(client, $"/api/quizzes/attempts/{attemptId}");
        Assert.Equal("Graded", final.GetProperty("status").GetString());
        Assert.Equal(17m, final.GetProperty("score").GetDecimal());
        Assert.Equal(17m, final.GetProperty("quiz").GetProperty("totalPoints").GetDecimal());
    }

    private static async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        client.DefaultRequestHeaders.Authorization = null;
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await ReadJsonAsync(response)).GetProperty("token").GetString()!;
    }

    private static async Task<string> RegisterAsync(HttpClient client, string email)
    {
        client.DefaultRequestHeaders.Authorization = null;
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Integration Student", email, password = "Testing@123",
        });
        response.EnsureSuccessStatusCode();
        return (await ReadJsonAsync(response)).GetProperty("token").GetString()!;
    }

    private static void Authorize(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static async Task<JsonElement> GetJsonAsync(HttpClient client, string uri)
    {
        var response = await client.GetAsync(uri);
        response.EnsureSuccessStatusCode();
        return await ReadJsonAsync(response);
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static string UniqueEmail(string prefix) => $"{prefix}.{Guid.NewGuid():N}@example.test";
}

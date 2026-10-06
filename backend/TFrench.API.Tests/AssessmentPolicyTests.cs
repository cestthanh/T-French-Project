using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TFrench.API.Data;
using Xunit;

namespace TFrench.API.Tests;

public class AssessmentPolicyTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset UtcNow = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => UtcNow;
    }

    [Fact]
    public async Task ServerTiming_EnforcesOpenAndCutoff_AndLabelsLateWithoutPenalty()
    {
        var clock = new Clock();
        using var factory = new ApiFactory(clock);
        using var client = factory.CreateClient();
        var teacher = await Login(client, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(client);
        var first = await Student(client, cohort);
        var second = await Student(client, cohort);
        var third = await Student(client, cohort);
        var open = clock.UtcNow.AddHours(1).UtcDateTime;
        var due = clock.UtcNow.AddHours(2).UtcDateTime;
        var cutoff = clock.UtcNow.AddHours(3).UtcDateTime;
        Auth(client, teacher);
        var id = (await Json(await client.PostAsJsonAsync("/api/assignments", new {
            title = "Timed homework", courseId = 1, classId = cohort, openAt = open,
            dueDate = due, allowLate = true, cutoffAt = cutoff,
        }))).GetProperty("id").GetInt32();
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/publish", new { }), HttpStatusCode.OK);
        Auth(client, first);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "Early" }), HttpStatusCode.Conflict);
        clock.UtcNow = new DateTimeOffset(open, TimeSpan.Zero);
        var timely = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "On time" }));
        Assert.False(timely.GetProperty("isLate").GetBoolean());
        Auth(client, second);
        clock.UtcNow = new DateTimeOffset(due.AddSeconds(1), TimeSpan.Zero);
        var late = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "Late" }));
        Assert.True(late.GetProperty("isLate").GetBoolean());
        Assert.Equal(JsonValueKind.Null, late.GetProperty("grade").ValueKind);
        Auth(client, third);
        clock.UtcNow = new DateTimeOffset(cutoff, TimeSpan.Zero);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "At cutoff" }), HttpStatusCode.Conflict);
        Auth(client, teacher);
        var hard = await CreateAssignment(client, cohort, clock.UtcNow.AddHours(1).UtcDateTime);
        Auth(client, third);
        clock.UtcNow = clock.UtcNow.AddHours(1);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{hard}/submit", new { note = "At due" }), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task DraftGrades_AreRedactedEverywhereUntilRelease_AndRegradingHidesThemAgain()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacher = await Login(client, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(client);
        var student = await Student(client, cohort);
        Auth(client, teacher);
        var id = await CreateAssignment(client, cohort, DateTime.UtcNow.AddDays(1));
        Auth(client, student);
        var submitted = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "Original" }));
        var sid = submitted.GetProperty("id").GetInt32();
        Auth(client, teacher);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submissions/{sid}/grade", new { grade = 8, feedback = "Private feedback" }), HttpStatusCode.OK);
        Auth(client, student);
        var hidden = await Json(await client.GetAsync($"/api/assignments/{id}"));
        Assert.EndsWith("Z", hidden.GetProperty("dueDate").GetString());
        Assert.EndsWith("Z", hidden.GetProperty("cutoffAt").GetString());
        Assert.Equal(JsonValueKind.Null, hidden.GetProperty("submissions")[0].GetProperty("grade").ValueKind);
        Assert.DoesNotContain("Private feedback", hidden.ToString());
        var retries = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "Original" }));
        Assert.Equal(JsonValueKind.Null, retries.GetProperty("grade").ValueKind);
        var mine = await Json(await client.GetAsync("/api/assignments/my-submissions"));
        Assert.Equal(JsonValueKind.Null, mine[0].GetProperty("grade").ValueKind);
        var book = await Json(await client.GetAsync($"/api/learning/classes/{cohort}/gradebook"));
        Assert.Single(book.GetProperty("rows").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, book.GetProperty("rows")[0].GetProperty("cells").GetProperty($"a-{id}").GetProperty("earned").ValueKind);
        Auth(client, teacher);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submissions/{sid}/release", new { }), HttpStatusCode.OK);
        Auth(client, student);
        book = await Json(await client.GetAsync($"/api/learning/classes/{cohort}/gradebook"));
        Assert.Equal(80m, book.GetProperty("rows")[0].GetProperty("cells").GetProperty($"a-{id}").GetProperty("percent").GetDecimal());
        Auth(client, teacher);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submissions/{sid}/grade", new { grade = 9 }), HttpStatusCode.OK);
        Auth(client, student);
        Assert.Equal(JsonValueKind.Null, (await Json(await client.GetAsync($"/api/assignments/{id}"))).GetProperty("submissions")[0].GetProperty("grade").ValueKind);
    }

    [Fact]
    public async Task GrantedAttempt_PreservesPreviousWorkAndResult_AndCannotBeGrantedTwice()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacher = await Login(client, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(client);
        var student = await Student(client, cohort);
        Auth(client, teacher);
        var id = await CreateAssignment(client, cohort, DateTime.UtcNow.AddDays(1));
        Auth(client, student);
        var first = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "First" }));
        var sid = first.GetProperty("id").GetInt32();
        var studentId = first.GetProperty("studentId").GetInt32();
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { attemptNumber = 2, note = "Unallowed" }), HttpStatusCode.Conflict);
        Auth(client, teacher);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submissions/{sid}/grade", new { grade = 7 }), HttpStatusCode.OK);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/submissions/{sid}/release", new { }), HttpStatusCode.OK);
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/close", new { }), HttpStatusCode.OK);
        var grant = new { studentId, reason = "Correct the verb agreement", cutoffAt = DateTime.UtcNow.AddHours(1) };
        var grants = await Task.WhenAll(client.PostAsJsonAsync($"/api/assignments/{id}/resubmissions", grant), client.PostAsJsonAsync($"/api/assignments/{id}/resubmissions", grant));
        Assert.Contains(grants, g => g.StatusCode == HttpStatusCode.OK);
        Assert.Contains(grants, g => g.StatusCode == HttpStatusCode.Conflict);
        Auth(client, student);
        var detail = await Json(await client.GetAsync($"/api/assignments/{id}"));
        Assert.Equal(2, detail.GetProperty("allowedAttemptNumber").GetInt32());
        var second = await Json(await client.PostAsJsonAsync($"/api/assignments/{id}/submit", new { attemptNumber = 2, note = "Second" }));
        Assert.NotEqual(sid, second.GetProperty("id").GetInt32());
        detail = await Json(await client.GetAsync($"/api/assignments/{id}"));
        var history = detail.GetProperty("submissions").EnumerateArray().ToArray();
        Assert.Equal(2, history.Length);
        var old = history.Single(s => s.GetProperty("attemptNumber").GetInt32() == 1);
        Assert.Equal("First", old.GetProperty("note").GetString());
        Assert.Equal(7, old.GetProperty("grade").GetInt32());
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/resubmissions", grant), HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ClosingAndSubmitting_CommitConsistently_AndOtherClassesCannotReadGradebook()
    {
        using var factory = new ApiFactory();
        using var staff = factory.CreateClient();
        using var learner = factory.CreateClient();
        var teacher = await Login(staff, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(staff);
        var student = await Student(learner, cohort);
        Auth(staff, teacher);
        var id = await CreateAssignment(staff, cohort, DateTime.UtcNow.AddDays(1));
        Auth(learner, student);
        var requests = await Task.WhenAll(staff.PostAsJsonAsync($"/api/assignments/{id}/close", new { }), learner.PostAsJsonAsync($"/api/assignments/{id}/submit", new { note = "Racing" }));
        Assert.Equal(HttpStatusCode.OK, requests[0].StatusCode);
        Assert.True(requests[1].StatusCode is HttpStatusCode.OK or HttpStatusCode.Conflict);
        var detail = await Json(await staff.GetAsync($"/api/assignments/{id}"));
        Assert.Equal("Closed", detail.GetProperty("status").GetString());
        Assert.Equal(requests[1].StatusCode == HttpStatusCode.OK ? 1 : 0, detail.GetProperty("submissions").GetArrayLength());
        var outsider = await Register(learner);
        Auth(learner, outsider);
        await Expect(learner.GetAsync($"/api/learning/classes/{cohort}/gradebook"), HttpStatusCode.Forbidden);
        await Expect(learner.GetAsync($"/api/learning/classes/{cohort}/overview"), HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task QuizScoreAndAnswers_RemainHiddenUntilClosedAndReleased()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacher = await Login(client, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(client);
        var student = await Student(client, cohort);
        Auth(client, teacher);
        var quiz = await Json(await client.PostAsJsonAsync("/api/quizzes", new {
            title = "Controlled results", classId = cohort, openAt = DateTime.UtcNow.AddMinutes(-1), closeAt = DateTime.UtcNow.AddHours(1), durationMinutes = 30,
            showAnswersAfterGrading = true, questions = new[] { new { type = "SingleChoice", content = "Oui?", points = 20,
                options = new[] { new { text = "Oui", isCorrect = true }, new { text = "Non", isCorrect = false } } } },
        }));
        var id = quiz.GetProperty("id").GetInt32();
        await Expect(client.PatchAsync($"/api/quizzes/{id}/publish", JsonContent.Create(new { })), HttpStatusCode.OK);
        Auth(client, student);
        var aid = (await Json(await client.PostAsJsonAsync($"/api/quizzes/{id}/start", new { }))).GetProperty("id").GetInt32();
        var paper = await Json(await client.GetAsync($"/api/quizzes/attempts/{aid}"));
        var q = paper.GetProperty("questions")[0];
        await Expect(client.PutAsJsonAsync($"/api/quizzes/attempts/{aid}/answers", new { version = 0, answers = new[] { new { questionId = q.GetProperty("id").GetInt32(), selectedOptionIds = new[] { q.GetProperty("options")[0].GetProperty("id").GetInt32() } } } }), HttpStatusCode.OK);
        var submitted = await Json(await client.PostAsJsonAsync($"/api/quizzes/attempts/{aid}/submit", new { }));
        Assert.Equal(JsonValueKind.Null, submitted.GetProperty("score").ValueKind);
        paper = await Json(await client.GetAsync($"/api/quizzes/attempts/{aid}"));
        Assert.Equal(JsonValueKind.Null, paper.GetProperty("score").ValueKind);
        Assert.DoesNotContain("\"isCorrect\":true", paper.ToString());
        Auth(client, teacher);
        await Expect(client.PostAsJsonAsync($"/api/quizzes/{id}/results/release", new { }), HttpStatusCode.Conflict);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Quizzes.FindAsync(id))!.CloseAt = DateTime.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();
        }
        await Expect(client.PostAsJsonAsync($"/api/quizzes/{id}/results/release", new { }), HttpStatusCode.OK);
        Auth(client, student);
        paper = await Json(await client.GetAsync($"/api/quizzes/attempts/{aid}"));
        Assert.Equal(20, paper.GetProperty("score").GetDecimal());
        Assert.True(paper.GetProperty("questions")[0].GetProperty("options")[0].GetProperty("isCorrect").GetBoolean());
    }

    [Fact]
    public async Task SharedMaterialFile_UsesAnyAuthorizedScope_AndDeletingOneResourceKeepsOtherLinks()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var teacher = await Login(client, "teacher@tfrench.vn", "Teacher@123");
        var cohort = await Cohort(client);
        var outsider = await Register(client);
        Auth(client, teacher);
        using var content = new MultipartFormDataContent();
        var bytes = System.Text.Encoding.UTF8.GetBytes("Shared learning material");
        content.Add(new ByteArrayContent(bytes), "file", "shared.txt");
        var file = await Json(await client.PostAsync("/api/files", content));
        var fileId = file.GetProperty("id").GetInt32();
        var publicId = file.GetProperty("publicId").GetString();
        var privateResource = await Json(await client.PostAsJsonAsync("/api/resources", new { title = "Private first", courseId = 1, classId = cohort, isPublic = false, fileId }));
        Assert.DoesNotContain("passwordHash", privateResource.ToString(), StringComparison.OrdinalIgnoreCase);
        var publicResource = await Json(await client.PostAsJsonAsync("/api/resources", new { title = "Explicit shared copy", isPublic = true, fileId }));
        var assignment = await Json(await client.PostAsJsonAsync("/api/assignments", new {
            title = "Reused brief", courseId = 1, classId = cohort, dueDate = DateTime.UtcNow.AddDays(1), attachmentId = fileId,
        }));
        Auth(client, outsider);
        Assert.Equal(bytes, await client.GetByteArrayAsync($"/api/files/{publicId}"));
        var resources = await Json(await client.GetAsync("/api/resources"));
        Assert.DoesNotContain(resources.EnumerateArray(), r => r.GetProperty("id").GetInt32() == privateResource.GetProperty("id").GetInt32());
        Auth(client, teacher);
        await Expect(client.DeleteAsync($"/api/resources/{privateResource.GetProperty("id").GetInt32()}"), HttpStatusCode.NoContent);
        Auth(client, outsider);
        Assert.Equal(bytes, await client.GetByteArrayAsync($"/api/files/{publicId}"));
        Auth(client, teacher);
        await Expect(client.DeleteAsync($"/api/resources/{publicResource.GetProperty("id").GetInt32()}"), HttpStatusCode.NoContent);
        Auth(client, outsider);
        await Expect(client.GetAsync($"/api/files/{publicId}"), HttpStatusCode.Forbidden);
        Auth(client, teacher);
        await Expect(client.DeleteAsync($"/api/assignments/{assignment.GetProperty("id").GetInt32()}"), HttpStatusCode.NoContent);
        Auth(client, outsider);
        await Expect(client.GetAsync($"/api/files/{publicId}"), HttpStatusCode.NotFound);
    }

    private static void Auth(HttpClient client, string token) => client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    private static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement.Clone();
    }
    private static async Task Expect(Task<HttpResponseMessage> request, HttpStatusCode status) => Assert.Equal(status, (await request).StatusCode);
    private static async Task<string> Login(HttpClient client, string email, string password) => (await Json(await client.PostAsJsonAsync("/api/auth/login", new { email, password }))).GetProperty("token").GetString()!;
    private static async Task<int> Cohort(HttpClient client) => (await Json(await client.GetAsync("/api/courses/1"))).GetProperty("classes")[0].GetProperty("id").GetInt32();
    private static async Task<string> Register(HttpClient client) => (await Json(await client.PostAsJsonAsync("/api/auth/register", new { fullName = "Policy learner", email = $"policy-{Guid.NewGuid():N}@example.test", password = "Testing@123" }))).GetProperty("token").GetString()!;
    private static async Task<string> Student(HttpClient client, int cohort)
    {
        var token = await Register(client); Auth(client, token);
        await Expect(client.PostAsJsonAsync("/api/courses/1/enroll", new { classId = cohort }), HttpStatusCode.OK);
        return token;
    }
    private static async Task<int> CreateAssignment(HttpClient client, int cohort, DateTime dueDate)
    {
        var id = (await Json(await client.PostAsJsonAsync("/api/assignments", new { title = "Policy homework", courseId = 1, classId = cohort, dueDate }))).GetProperty("id").GetInt32();
        await Expect(client.PostAsJsonAsync($"/api/assignments/{id}/publish", new { }), HttpStatusCode.OK);
        return id;
    }
}

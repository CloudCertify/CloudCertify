using API.Controllers;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace API.Tests.Controllers;

/// <summary>Maps each <see cref="ReportOutcome"/> to the status code the endpoint promises.</summary>
public class ReportControllerTests
{
    private readonly Mock<ISubmissionRepository> _submissions = new();
    private readonly Mock<IReportRepository> _reports = new();
    private readonly Mock<IQuestionRepository> _questions = new();

    private ReportController CreateController() =>
        new(new ReportService(_submissions.Object, _reports.Object, _questions.Object));

    private void GivenCheckedDrillSubmission()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission
        {
            Id = 1,
            QuizId = 7,
            DrillId = 3,
            Mode = Mode.Practice,
            Email = "anon@example.com",
            RecordedAnswers = [new RecordedAnswer { SubmissionId = 1, QuestionId = 10, SelectedAnswerIds = [42] }],
        });
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);
    }

    private static CreateReportRequestDto Request(List<ReportReason>? reasons = null, string? comment = null) =>
        new() { SubmissionId = 1, QuestionId = 10, Reasons = reasons ?? [ReportReason.WrongAnswerKey], Comment = comment };

    [Fact]
    public async Task CreateReport_Returns201_WithPersistedReport()
    {
        GivenCheckedDrillSubmission();

        var result = await CreateController().CreateReport(Request());

        var response = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, response.StatusCode);
        var dto = Assert.IsType<ReportResponseDto>(response.Value);
        Assert.Equal(ReportStatus.Open, dto.Status);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenReasonsEmpty()
    {
        GivenCheckedDrillSubmission();

        var result = await CreateController().CreateReport(Request([]));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenCommentTooLong()
    {
        GivenCheckedDrillSubmission();

        var result = await CreateController().CreateReport(Request(comment: new string('x', 201)));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenQuestionNotChecked()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission { Id = 1, QuizId = 7, DrillId = 3, Mode = Mode.Practice });

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenExamSubmission()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission
        {
            Id = 1,
            QuizId = 7,
            DrillId = null,
            Mode = Mode.Exam,
            RecordedAnswers = [new RecordedAnswer { SubmissionId = 1, QuestionId = 10 }],
        });

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns404_WhenSubmissionMissing()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync((Submission?)null);

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenSuggestionIsInapplicable()
    {
        GivenCheckedDrillSubmission();
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync([
            new Question
            {
                Id = 10,
                Type = QuestionType.MultipleChoice,
                SelectCount = 1,
                Answers = [new Answer { Id = 101, Text = "A", IsCorrect = true }],
            }
        ]);

        var request = Request();
        request.Suggestion = new SuggestionDto
        {
            Answers = [new AnswerSuggestionDto { AnswerId = 999, Text = "not mine" }],
        };

        var result = await CreateController().CreateReport(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns409_WhenAlreadyReported()
    {
        GivenCheckedDrillSubmission();
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report?)null);

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<ConflictObjectResult>(result.Result);
    }
}

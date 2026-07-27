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

    private ReportController CreateController() =>
        new(new ReportService(_submissions.Object, _reports.Object));

    private void GivenCheckedSubquizSubmission()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission
        {
            Id = 1,
            QuizId = 7,
            SubquizId = 3,
            Email = "anon@example.com",
            RecordedAnswers = [new RecordedAnswer { SubmissionId = 1, QuestionId = 10, SelectedAnswerIds = [42] }],
        });
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report r) => r);
    }

    private static CreateReportRequestDto Request(List<ReportReason>? reasons = null, string? comment = null) =>
        new() { SubmissionId = 1, QuestionId = 10, Reasons = reasons ?? [ReportReason.WrongAnswerKey], Comment = comment };

    [Fact]
    public async Task CreateReport_Returns201_WithPersistedReport()
    {
        GivenCheckedSubquizSubmission();

        var result = await CreateController().CreateReport(Request());

        var response = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, response.StatusCode);
        var dto = Assert.IsType<ReportResponseDto>(response.Value);
        Assert.Equal(ReportStatus.Open, dto.Status);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenReasonsEmpty()
    {
        GivenCheckedSubquizSubmission();

        var result = await CreateController().CreateReport(Request([]));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenCommentTooLong()
    {
        GivenCheckedSubquizSubmission();

        var result = await CreateController().CreateReport(Request(comment: new string('x', 201)));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenQuestionNotChecked()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission { Id = 1, QuizId = 7, SubquizId = 3 });

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateReport_Returns400_WhenFullQuizSubmission()
    {
        _submissions.Setup(r => r.GetById(1)).ReturnsAsync(new Submission
        {
            Id = 1,
            QuizId = 7,
            SubquizId = null,
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
    public async Task CreateReport_Returns409_WhenAlreadyReported()
    {
        GivenCheckedSubquizSubmission();
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report?)null);

        var result = await CreateController().CreateReport(Request());

        Assert.IsType<ConflictObjectResult>(result.Result);
    }
}

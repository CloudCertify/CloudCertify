using API.Entities;
using API.Model.Request;
using API.Repositories;
using API.Services;
using Moq;

namespace API.Tests.Services;

public class ReportServiceTests
{
    private readonly Mock<ISubmissionRepository> _submissions = new();
    private readonly Mock<IReportRepository> _reports = new();

    private ReportService CreateService() => new(_submissions.Object, _reports.Object);

    private void GivenSubmission(Submission submission) =>
        _submissions.Setup(r => r.GetById(submission.Id)).ReturnsAsync(submission);

    private static Submission SubquizSubmission(Language language = Language.EnUs, params int[] checkedQuestionIds) =>
        new()
        {
            Id = 1,
            QuizId = 7,
            SubquizId = 3,
            Language = language,
            Email = "anon@example.com",
            RecordedAnswers = checkedQuestionIds
                .Select(id => new RecordedAnswer { SubmissionId = 1, QuestionId = id, SelectedAnswerIds = [42] })
                .ToList(),
        };

    private static CreateReportRequestDto Request(
        List<ReportReason>? reasons = null, string? comment = null, int questionId = 10) =>
        new()
        {
            SubmissionId = 1,
            QuestionId = questionId,
            Reasons = reasons ?? [ReportReason.WrongAnswerKey],
            Comment = comment,
        };

    [Fact]
    public async Task FileReport_PersistsOpenReport_WithSubmissionLanguage()
    {
        GivenSubmission(SubquizSubmission(Language.PtBr, 10));
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(
            [ReportReason.WrongAnswerKey, ReportReason.Outdated], "wrong key"));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        Assert.NotNull(result.Report);
        Assert.Equal(ReportStatus.Open, result.Report!.Status);
        Assert.Equal(Language.PtBr, result.Report.Language); // from the Submission, not the request (ADR 0004)
        Assert.Equal([ReportReason.WrongAnswerKey, ReportReason.Outdated], result.Report.Reasons);
        _reports.Verify(r => r.Create(It.Is<Report>(rep =>
            rep.SubmissionId == 1 && rep.QuestionId == 10 && rep.Comment == "wrong key" &&
            rep.Language == Language.PtBr && rep.Status == ReportStatus.Open)), Times.Once);
    }

    [Fact]
    public async Task FileReport_CollapsesDuplicateReasons()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(
            [ReportReason.Outdated, ReportReason.Outdated]));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        Assert.Equal([ReportReason.Outdated], result.Report!.Reasons);
    }

    [Fact]
    public async Task FileReport_AllowsAnonymousSubmission()
    {
        var submission = SubquizSubmission(Language.EnUs, 10);
        submission.UserId = null;
        GivenSubmission(submission);
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenNoReasons()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request([]));

        Assert.Equal(ReportOutcome.NoReasons, result.Outcome);
        _reports.Verify(r => r.Create(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_UnknownReason()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request([(ReportReason)999]));

        Assert.Equal(ReportOutcome.NoReasons, result.Outcome);
        _reports.Verify(r => r.Create(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenCommentTooLong()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request(comment: new string('x', 201)));

        Assert.Equal(ReportOutcome.CommentTooLong, result.Outcome);
        _reports.Verify(r => r.Create(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Accepts_CommentAtMaxLength()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(comment: new string('x', 200)));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenQuestionNotChecked()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 11)); // served/checked another question

        var result = await CreateService().FileReport(Request(questionId: 10));

        Assert.Equal(ReportOutcome.NotChecked, result.Outcome);
        _reports.Verify(r => r.Create(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenSubmissionIsFullQuiz()
    {
        var submission = SubquizSubmission(Language.EnUs, 10);
        submission.SubquizId = null;
        GivenSubmission(submission);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.NotSubquiz, result.Outcome);
        _reports.Verify(r => r.Create(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenAlreadyReported()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Create(It.IsAny<Report>())).ReturnsAsync((Report?)null); // primary key already taken

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.AlreadyReported, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenSubmissionMissing()
    {
        _submissions.Setup(r => r.GetById(It.IsAny<int>())).ReturnsAsync((Submission?)null);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.SubmissionNotFound, result.Outcome);
    }
}

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
    private readonly Mock<IQuestionRepository> _questions = new();

    private ReportService CreateService() => new(_submissions.Object, _reports.Object, _questions.Object);

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
        List<ReportReason>? reasons = null, string? comment = null, int questionId = 10,
        SuggestionDto? suggestion = null) =>
        new()
        {
            SubmissionId = 1,
            QuestionId = questionId,
            Reasons = reasons ?? [ReportReason.WrongAnswerKey],
            Comment = comment,
            Suggestion = suggestion,
        };

    /// <summary>Question 10: pick one of A (correct) / B / C.</summary>
    private void GivenQuestion(QuestionType type = QuestionType.MultipleChoice, int selectCount = 1) =>
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.Contains(10))))
            .ReturnsAsync([
                new Question
                {
                    Id = 10,
                    Text = "Which service stores objects?",
                    Type = type,
                    SelectCount = selectCount,
                    Answers =
                    [
                        new Answer { Id = 101, Text = "A", IsCorrect = true },
                        new Answer { Id = 102, Text = "B", IsCorrect = false },
                        new Answer { Id = 103, Text = "C", IsCorrect = false },
                    ],
                }
            ]);

    [Fact]
    public async Task FileReport_PersistsOpenReport_WithSubmissionLanguage()
    {
        GivenSubmission(SubquizSubmission(Language.PtBr, 10));
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(
            [ReportReason.WrongAnswerKey, ReportReason.Outdated], "wrong key"));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        Assert.NotNull(result.Report);
        Assert.Equal(ReportStatus.Open, result.Report!.Status);
        Assert.Equal(Language.PtBr, result.Report.Language); // from the Submission, not the request (ADR 0004)
        Assert.Equal([ReportReason.WrongAnswerKey, ReportReason.Outdated], result.Report.Reasons);
        _reports.Verify(r => r.Save(It.Is<Report>(rep =>
            rep.SubmissionId == 1 && rep.QuestionId == 10 && rep.Comment == "wrong key" &&
            rep.Language == Language.PtBr && rep.Status == ReportStatus.Open)), Times.Once);
    }

    [Fact]
    public async Task FileReport_CollapsesDuplicateReasons()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

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
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenNoReasons()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request([]));

        Assert.Equal(ReportOutcome.NoReasons, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_UnknownReason()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request([(ReportReason)999]));

        Assert.Equal(ReportOutcome.NoReasons, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenCommentTooLong()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));

        var result = await CreateService().FileReport(Request(comment: new string('x', 201)));

        Assert.Equal(ReportOutcome.CommentTooLong, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Accepts_CommentAtMaxLength()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(comment: new string('x', 200)));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenQuestionNotChecked()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 11)); // served/checked another question

        var result = await CreateService().FileReport(Request(questionId: 10));

        Assert.Equal(ReportOutcome.NotChecked, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenSubmissionIsFullQuiz()
    {
        var submission = SubquizSubmission(Language.EnUs, 10);
        submission.SubquizId = null;
        GivenSubmission(submission);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.NotSubquiz, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenAlreadyReported()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report?)null); // primary key already taken

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.AlreadyReported, result.Outcome);
    }

    [Fact]
    public async Task FileReport_StoresSuggestionAsSparsePatch()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            QuestionText = "  Which service stores objects durably?  ",
            Answers =
            [
                new AnswerSuggestionDto { AnswerId = 101, Text = "A", IsCorrect = false },
                new AnswerSuggestionDto { AnswerId = 102, IsCorrect = true },
                new AnswerSuggestionDto { AnswerId = 103, Text = "C" }, // unchanged, dropped
            ],
        }));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        var patch = result.Report!.Suggestion;
        Assert.NotNull(patch);
        Assert.Equal("Which service stores objects durably?", patch!.QuestionText);
        Assert.Equal([101, 102], patch.Answers.Select(a => a.AnswerId));
        // Only the fields that actually differ survive: A keeps its text, B keeps its wording.
        Assert.Null(patch.Answers[0].Text);
        Assert.False(patch.Answers[0].IsCorrect);
        Assert.Null(patch.Answers[1].Text);
        Assert.True(patch.Answers[1].IsCorrect);
    }

    [Fact]
    public async Task FileReport_StoresNullSuggestion_WhenNothingActuallyChanged()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            QuestionText = "Which service stores objects?",
            Answers = [new AnswerSuggestionDto { AnswerId = 101, Text = "A", IsCorrect = true }],
        }));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        Assert.Null(result.Report!.Suggestion);
    }

    [Fact]
    public async Task FileReport_Rejects_SuggestionForAnotherQuestionsAnswer()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            Answers = [new AnswerSuggestionDto { AnswerId = 999, Text = "elsewhere" }],
        }));

        Assert.Equal(ReportOutcome.InvalidSuggestion, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_SuggestedKeyWithWrongNumberOfCorrectAnswers()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();

        // Marking B correct without unmarking A leaves two correct answers on a single-choice.
        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            Answers = [new AnswerSuggestionDto { AnswerId = 102, IsCorrect = true }],
        }));

        Assert.Equal(ReportOutcome.InvalidSuggestion, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Accepts_SuggestedKeyMatchingSelectCount()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion(QuestionType.MultipleResponse, selectCount: 2);
        _reports.Setup(r => r.Save(It.IsAny<Report>())).ReturnsAsync((Report r) => r);

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            Answers = [new AnswerSuggestionDto { AnswerId = 102, IsCorrect = true }],
        }));

        Assert.Equal(ReportOutcome.Filed, result.Outcome);
        Assert.Single(result.Report!.Suggestion!.Answers);
    }

    [Fact]
    public async Task FileReport_Rejects_SuggestedTextOverTheCap()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            QuestionText = new string('x', ReportService.MaxSuggestedTextLength + 1),
        }));

        Assert.Equal(ReportOutcome.InvalidSuggestion, result.Outcome);
        _reports.Verify(r => r.Save(It.IsAny<Report>()), Times.Never);
    }

    [Fact]
    public async Task FileReport_Rejects_DuplicateAnswerInSuggestion()
    {
        GivenSubmission(SubquizSubmission(Language.EnUs, 10));
        GivenQuestion();

        var result = await CreateService().FileReport(Request(suggestion: new SuggestionDto
        {
            Answers =
            [
                new AnswerSuggestionDto { AnswerId = 102, Text = "B prime" },
                new AnswerSuggestionDto { AnswerId = 102, Text = "B double prime" },
            ],
        }));

        Assert.Equal(ReportOutcome.InvalidSuggestion, result.Outcome);
    }

    [Fact]
    public async Task FileReport_Rejects_WhenSubmissionMissing()
    {
        _submissions.Setup(r => r.GetById(It.IsAny<int>())).ReturnsAsync((Submission?)null);

        var result = await CreateService().FileReport(Request());

        Assert.Equal(ReportOutcome.SubmissionNotFound, result.Outcome);
    }
}

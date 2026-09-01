using API.Entities;
using API.Model.Request;
using API.Repositories;
using API.Services;
using API.Services.Grading;
using Moq;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

/// <summary>
/// The full-quiz and drill submit paths funnel through one <see cref="SubmissionGrader"/>,
/// so the lifecycle guards (ownership + finished) are proven once here against both shapes:
/// a full-quiz attempt (expectedDrillId null) and a drill attempt (expectedDrillId set).
/// </summary>
public class SubmissionGraderTests
{
    private readonly Mock<IQuestionRepository> _questions = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    private SubmissionGrader CreateGrader() => new(_questions.Object, _submissions.Object);

    private static readonly IGradingStrategy AnyStrategy = new DefaultGradingStrategy();

    [Fact]
    public async Task GradeAndFinish_Throws_WhenSubmissionMissing()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync((Submission?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().GradeAndFinish(5, 1, null, AnyStrategy, new List<QuizAnswer>()));
    }

    [Theory]
    [InlineData(null)] // full-quiz caller
    [InlineData(2)]    // drill caller
    public async Task GradeAndFinish_Throws_OnQuizMismatch_ForBothPaths(int? expectedDrillId)
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 99, DrillId = expectedDrillId });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().GradeAndFinish(5, 1, expectedDrillId, AnyStrategy, new List<QuizAnswer>()));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Theory]
    [InlineData(null)] // full-quiz caller
    [InlineData(2)]    // drill caller
    public async Task GradeAndFinish_Throws_AndPreservesScore_WhenFinished_ForBothPaths(int? expectedDrillId)
    {
        var finished = new Submission { Id = 5, QuizId = 1, DrillId = expectedDrillId, Finished = true, Score = 88 };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(finished);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().GradeAndFinish(5, 1, expectedDrillId, AnyStrategy, new List<QuizAnswer>()));

        Assert.Equal(88, finished.Score);
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
        _questions.Verify(r => r.GetQuestionsByIds(It.IsAny<List<int>>()), Times.Never);
    }

    [Fact]
    public async Task GradeAndFinish_GradesServedSet_AndMarksFinished()
    {
        var submission = new Submission { Id = 5, QuizId = 1, ServedQuestionIds = [100], Email = "u@e.com" };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 100 }))))
            .ReturnsAsync(new List<Question> { Question(100, "D", correctIds: [1], wrongIds: [2]) });

        var response = await CreateGrader()
            .GradeAndFinish(5, 1, null, AnyStrategy, new List<QuizAnswer> { Answer(100, 1) });

        Assert.Equal(1, response.CorrectCount);
        Assert.True(submission.Finished);
        _submissions.Verify(r => r.Update(It.Is<Submission>(s => s.Finished)), Times.Once);
    }
}

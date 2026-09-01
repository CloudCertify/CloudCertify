using API.Model.Request;
using API.Services.Grading;
using static API.Tests.QuizBuilder;

namespace API.Tests.Grading;

public class PracticeGradingStrategyTests
{
    private readonly PracticeGradingStrategy _strategy = new();

    [Fact]
    public void ScoreIsPlainPercentage_NotScaled()
    {
        var questions = new[]
        {
            Question(1, "D", correctIds: [10], wrongIds: [11]),
            Question(2, "D", correctIds: [20], wrongIds: [21]),
        };
        var answers = new List<QuizAnswer> { Answer(1, 10), Answer(2, 20) };

        var result = _strategy.Grade(questions, answers);

        Assert.Equal(100, result.ScaledScore);
        Assert.True(result.Passed);
    }

    [Fact]
    public void PassThresholdIsSeventyPercent()
    {
        var questions = Enumerable.Range(1, 10)
            .Select(i => Question(i, "D", correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToArray();
        // 7 of 10 correct -> exactly 70%.
        var answers = questions
            .Select((q, idx) => Answer(q.Id, idx < 7 ? (idx + 1) * 10 : (idx + 1) * 10 + 1))
            .ToList();

        var result = _strategy.Grade(questions, answers);

        Assert.Equal(70, result.ScaledScore);
        Assert.True(result.Passed);
    }

    [Fact]
    public void PercentageIsRounded()
    {
        var questions = new[]
        {
            Question(1, "D", correctIds: [10], wrongIds: [11]),
            Question(2, "D", correctIds: [20], wrongIds: [21]),
            Question(3, "D", correctIds: [30], wrongIds: [31]),
        };
        // 2 of 3 -> 66.67 rounds to 67, below pass.
        var answers = new List<QuizAnswer> { Answer(1, 10), Answer(2, 20), Answer(3, 31) };

        var result = _strategy.Grade(questions, answers);

        Assert.Equal(67, result.ScaledScore);
        Assert.False(result.Passed);
    }

    [Fact]
    public void NoQuestions_ScoresZero()
    {
        var result = _strategy.Grade([], new List<QuizAnswer>());

        Assert.Equal(0, result.ScaledScore);
        Assert.False(result.Passed);
    }
}

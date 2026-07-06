using API.Model.Request;
using API.Services.Grading;
using static API.Tests.QuizBuilder;

namespace API.Tests.Grading;

public class WeightedDomainGradingStrategyTests
{
    private sealed class TwoDomainStrategy : WeightedDomainGradingStrategy
    {
        public TwoDomainStrategy(int passingScaledScore) : base(
            new Dictionary<string, double> { { "Alpha", 0.70 }, { "Beta", 0.30 } },
            passingScaledScore)
        { }
    }

    private sealed class BrokenWeightsStrategy : WeightedDomainGradingStrategy
    {
        public BrokenWeightsStrategy() : base(
            new Dictionary<string, double> { { "Alpha", 0.70 } },
            passingScaledScore: 720)
        { }
    }

    [Fact]
    public void WeightsNotSummingToOne_Throws()
    {
        var ex = Assert.Throws<ArgumentException>(() => new BrokenWeightsStrategy());
        Assert.Contains("0.7", ex.Message);
    }

    [Fact]
    public void PassingScore_ComparesAgainstConfiguredThreshold()
    {
        // Only the 0.70-weight domain answered correctly: 100 + 0.70 * 900 = 730.
        var questions = new[]
        {
            Question(1, "Alpha", correctIds: [10], wrongIds: [11]),
            Question(2, "Beta", correctIds: [20], wrongIds: [21]),
        };
        var answers = new List<QuizAnswer> { Answer(1, 10), Answer(2, 21) };

        var passesAssociate = new TwoDomainStrategy(passingScaledScore: 720)
            .Grade(questions, answers);
        var failsSpecialty = new TwoDomainStrategy(passingScaledScore: 750)
            .Grade(questions, answers);

        Assert.Equal(730, passesAssociate.ScaledScore);
        Assert.True(passesAssociate.Passed);
        Assert.False(failsSpecialty.Passed);
    }

    [Theory]
    [InlineData(typeof(SaaC03GradingStrategy))]
    [InlineData(typeof(DvaC02GradingStrategy))]
    [InlineData(typeof(SoaC03GradingStrategy))]
    [InlineData(typeof(AnsC01GradingStrategy))]
    [InlineData(typeof(ScsC03GradingStrategy))]
    [InlineData(typeof(ClfC02GradingStrategy))]
    public void EveryExamStrategy_HasWeightsSummingToOne(Type strategyType)
    {
        // Constructor validates the weight sum; instantiation succeeding is the assertion.
        var strategy = Activator.CreateInstance(strategyType);

        Assert.IsAssignableFrom<WeightedDomainGradingStrategy>(strategy);
    }
}

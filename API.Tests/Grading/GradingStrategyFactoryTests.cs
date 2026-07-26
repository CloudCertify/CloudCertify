using API.Entities;
using API.Services.Grading;

namespace API.Tests.Grading;

public class GradingStrategyFactoryTests
{
    [Theory]
    [InlineData("CLF-C02", typeof(ClfC02GradingStrategy))]
    [InlineData("SAA-C03", typeof(SaaC03GradingStrategy))]
    [InlineData("DVA-C02", typeof(DvaC02GradingStrategy))]
    [InlineData("SOA-C03", typeof(SoaC03GradingStrategy))]
    [InlineData("ANS-C01", typeof(AnsC01GradingStrategy))]
    [InlineData("SCS-C03", typeof(ScsC03GradingStrategy))]
    [InlineData("SAP-C02", typeof(SapC02GradingStrategy))]
    [InlineData("DOP-C02", typeof(DopC02GradingStrategy))]
    [InlineData("AIF-C01", typeof(AifC01GradingStrategy))]
    [InlineData("DEA-C01", typeof(DeaC01GradingStrategy))]
    [InlineData("MLA-C01", typeof(MlaC01GradingStrategy))]
    public void KnownSlug_SelectsExamWeightedStrategy(string slug, Type expectedStrategyType)
    {
        var quiz = new Quiz { Slug = slug };

        var strategy = GradingStrategyFactory.GetStrategy(quiz);

        Assert.IsType(expectedStrategyType, strategy);
    }

    [Fact]
    public void UnknownSlug_FallsBackToDefaultStrategy()
    {
        var quiz = new Quiz { Slug = "XYZ-C99" };

        var strategy = GradingStrategyFactory.GetStrategy(quiz);

        Assert.IsType<DefaultGradingStrategy>(strategy);
    }

    [Fact]
    public void GetSubquizStrategy_SelectsDomainSubquizStrategy()
    {
        var strategy = GradingStrategyFactory.GetSubquizStrategy();

        Assert.IsType<DomainSubquizGradingStrategy>(strategy);
    }
}

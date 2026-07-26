using API.Model.Request;
using API.Services.Grading;
using static API.Tests.QuizBuilder;

namespace API.Tests.Grading;

/// <summary>
/// Per-exam checks for the strategies added alongside the SAP/DOP/AIF/DEA/MLA question
/// banks. Each exam asserts the two things a weighting table can get wrong: a perfect
/// sitting must reach 1000 (weights sum to 1.0 and every domain string matches), and a
/// single-domain sitting must score that domain's published weight — which fails loudly
/// if a title drifts from the exam guide.
/// </summary>
public class ExamGradingStrategyTests
{
    public static TheoryData<IGradingStrategy, string[], int> ExamDomains => new()
    {
        {
            new SapC02GradingStrategy(),
            [
                "Design Solutions for Organizational Complexity",
                "Design for New Solutions",
                "Continuous Improvement for Existing Solutions",
                "Accelerate Workload Migration and Modernization"
            ],
            750
        },
        {
            new DopC02GradingStrategy(),
            [
                "SDLC Automation",
                "Configuration Management and IaC",
                "Resilient Cloud Solutions",
                "Monitoring and Logging",
                "Incident and Event Response",
                "Security and Compliance"
            ],
            750
        },
        {
            new AifC01GradingStrategy(),
            [
                "Fundamentals of AI and ML",
                "Fundamentals of GenAI",
                "Applications of Foundation Models",
                "Guidelines for Responsible AI",
                "Security, Compliance, and Governance for AI Solutions"
            ],
            700
        },
        {
            new DeaC01GradingStrategy(),
            [
                "Data Ingestion and Transformation",
                "Data Store Management",
                "Data Operations and Support",
                "Data Security and Governance"
            ],
            720
        },
        {
            new MlaC01GradingStrategy(),
            [
                "Data Preparation for Machine Learning (ML)",
                "ML Model Development",
                "Deployment and Orchestration of ML Workflows",
                "ML Solution Monitoring, Maintenance, and Security"
            ],
            720
        }
    };

    [Theory]
    [MemberData(nameof(ExamDomains))]
    public void EveryDomainPerfect_Scores1000AndPasses(
        IGradingStrategy strategy, string[] domains, int passingScore)
    {
        var questions = domains
            .Select((domain, i) => Question(i + 1, domain, correctIds: [(i + 1) * 10], wrongIds: [(i + 1) * 10 + 1]))
            .ToArray();
        var answers = domains.Select((_, i) => Answer(i + 1, (i + 1) * 10)).ToList();

        var result = strategy.Grade(questions, answers);

        Assert.Equal(1000, result.ScaledScore);
        Assert.True(result.Passed, $"1000 must clear the {passingScore} passing score");
        Assert.Equal(domains.Length, result.CorrectCount);
        Assert.Equal(domains.Length, result.DomainBreakdown.Count);
    }

    [Theory]
    [MemberData(nameof(ExamDomains))]
    public void EveryDomainFailed_Scores100AndFails(
        IGradingStrategy strategy, string[] domains, int passingScore)
    {
        var questions = domains
            .Select((domain, i) => Question(i + 1, domain, correctIds: [(i + 1) * 10], wrongIds: [(i + 1) * 10 + 1]))
            .ToArray();
        var answers = domains.Select((_, i) => Answer(i + 1, (i + 1) * 10 + 1)).ToList();

        var result = strategy.Grade(questions, answers);

        Assert.Equal(100, result.ScaledScore);
        Assert.False(result.Passed, $"100 must not clear the {passingScore} passing score");
        Assert.Equal(0, result.CorrectCount);
    }

    /// <summary>
    /// A perfect sitting of one domain scores exactly that domain's weight, so a title
    /// that no longer matches the question bank collapses to the unweighted 100 floor.
    /// </summary>
    [Theory]
    [MemberData(nameof(ExamDomains))]
    public void SingleDomainPerfect_ScoresThatDomainsWeight(
        IGradingStrategy strategy, string[] domains, int passingScore)
    {
        _ = passingScore;

        foreach (var domain in domains)
        {
            var result = strategy.Grade(
                [Question(1, domain, correctIds: [10], wrongIds: [11])],
                [Answer(1, 10)]);

            var weight = Assert.Single(result.DomainBreakdown).Weight;
            Assert.Equal((int)Math.Round(100 + weight * 900), result.ScaledScore);
            Assert.True(weight > 0, $"\"{domain}\" carries no weight — title drifted from the exam guide");
        }
    }
}

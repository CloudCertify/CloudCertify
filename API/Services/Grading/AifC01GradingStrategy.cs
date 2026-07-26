namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.html
public class AifC01GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Fundamentals of AI and ML", 0.20 },
        { "Fundamentals of GenAI", 0.24 },
        { "Applications of Foundation Models", 0.28 },
        { "Guidelines for Responsible AI", 0.14 },
        { "Security, Compliance, and Governance for AI Solutions", 0.14 }
    };

    public AifC01GradingStrategy() : base(DomainWeights, passingScaledScore: 700) { }
}

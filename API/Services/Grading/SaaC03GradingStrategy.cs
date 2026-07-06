namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html
public class SaaC03GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Design Secure Architectures", 0.30 },
        { "Design Resilient Architectures", 0.26 },
        { "Design High-Performing Architectures", 0.24 },
        { "Design Cost-Optimized Architectures", 0.20 }
    };

    public SaaC03GradingStrategy() : base(DomainWeights, passingScaledScore: 720) { }
}

namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-02/solutions-architect-professional-02.html
public class SapC02GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Design Solutions for Organizational Complexity", 0.26 },
        { "Design for New Solutions", 0.29 },
        { "Continuous Improvement for Existing Solutions", 0.25 },
        { "Accelerate Workload Migration and Modernization", 0.20 }
    };

    public SapC02GradingStrategy() : base(DomainWeights, passingScaledScore: 750) { }
}

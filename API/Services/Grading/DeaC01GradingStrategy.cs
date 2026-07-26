namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html
public class DeaC01GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Data Ingestion and Transformation", 0.34 },
        { "Data Store Management", 0.26 },
        { "Data Operations and Support", 0.22 },
        { "Data Security and Governance", 0.18 }
    };

    public DeaC01GradingStrategy() : base(DomainWeights, passingScaledScore: 720) { }
}

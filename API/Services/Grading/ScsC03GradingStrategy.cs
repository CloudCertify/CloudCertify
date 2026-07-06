namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html
public class ScsC03GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Detection", 0.16 },
        { "Incident Response", 0.14 },
        { "Infrastructure Security", 0.18 },
        { "Identity and Access Management", 0.20 },
        { "Data Protection", 0.18 },
        { "Security Foundations and Governance", 0.14 }
    };

    public ScsC03GradingStrategy() : base(DomainWeights, passingScaledScore: 750) { }
}

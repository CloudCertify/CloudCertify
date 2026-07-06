namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html
// Note: the question bank still carries a legacy "Network Performance Optimization"
// domain from an older guide revision; it has no official weight, so those questions
// count in the raw tally but not the scaled score.
public class AnsC01GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Network Design", 0.30 },
        { "Network Implementation", 0.26 },
        { "Network Management and Operation", 0.20 },
        { "Network Security, Compliance, and Governance", 0.24 }
    };

    public AnsC01GradingStrategy() : base(DomainWeights, passingScaledScore: 750) { }
}

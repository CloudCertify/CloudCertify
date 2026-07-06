namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/developer-associate-02/developer-associate-02.html
public class DvaC02GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Development with AWS Services", 0.32 },
        { "Security", 0.26 },
        { "Deployment", 0.24 },
        { "Troubleshooting and Optimization", 0.18 }
    };

    public DvaC02GradingStrategy() : base(DomainWeights, passingScaledScore: 720) { }
}

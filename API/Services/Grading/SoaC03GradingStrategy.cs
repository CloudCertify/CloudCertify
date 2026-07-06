namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html
public class SoaC03GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Monitoring, Logging, Analysis, Remediation, and Performance Optimization", 0.22 },
        { "Reliability and Business Continuity", 0.22 },
        { "Deployment, Provisioning, and Automation", 0.22 },
        { "Security and Compliance", 0.16 },
        { "Networking and Content Delivery", 0.18 }
    };

    public SoaC03GradingStrategy() : base(DomainWeights, passingScaledScore: 720) { }
}

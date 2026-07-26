namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html
public class DopC02GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "SDLC Automation", 0.22 },
        { "Configuration Management and IaC", 0.17 },
        { "Resilient Cloud Solutions", 0.15 },
        { "Monitoring and Logging", 0.15 },
        { "Incident and Event Response", 0.14 },
        { "Security and Compliance", 0.17 }
    };

    public DopC02GradingStrategy() : base(DomainWeights, passingScaledScore: 750) { }
}

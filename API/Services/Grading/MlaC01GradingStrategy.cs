namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-01/machine-learning-engineer-associate-01.html
// The "(ML)" in domain 1 is part of the official domain title and must match the
// question bank's Domain values verbatim, or the domain scores zero weight.
public class MlaC01GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Data Preparation for Machine Learning (ML)", 0.28 },
        { "ML Model Development", 0.26 },
        { "Deployment and Orchestration of ML Workflows", 0.22 },
        { "ML Solution Monitoring, Maintenance, and Security", 0.24 }
    };

    public MlaC01GradingStrategy() : base(DomainWeights, passingScaledScore: 720) { }
}

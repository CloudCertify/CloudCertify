namespace API.Services.Grading;

// Source: https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html
public class ClfC02GradingStrategy : WeightedDomainGradingStrategy
{
    private static readonly Dictionary<string, double> DomainWeights = new()
    {
        { "Cloud Concepts", 0.24 },
        { "Security and Compliance", 0.30 },
        { "Cloud Technology and Services", 0.34 },
        { "Billing, Pricing, and Support", 0.12 }
    };

    public ClfC02GradingStrategy() : base(DomainWeights, passingScaledScore: 700) { }
}

namespace API.Services.Grading;

/// <summary>
/// One certification's published scoring: its content-Domain weights (summing to 1.0), the
/// passing Scaled Score, and the exam guide they come from. Domain names must match the question
/// bank's Domain values verbatim, or that Domain scores zero weight.
/// </summary>
public record ExamWeighting(IReadOnlyDictionary<string, double> DomainWeights, int PassingScaledScore, string SourceUrl);

/// <summary>
/// The Exam Weighting for every cataloged certification, keyed by Quiz slug. Adding a
/// certification is one row here; the tests check each row sums to 1.0 and names Domains the
/// question bank uses.
/// </summary>
/// <example><c>ExamWeightings.BySlug.TryGetValue("SAA-C03", out var weighting)</c></example>
public static class ExamWeightings
{
    private const string Guides = "https://docs.aws.amazon.com/aws-certification/latest/";

    public static readonly IReadOnlyDictionary<string, ExamWeighting> BySlug = new Dictionary<string, ExamWeighting>
    {
        ["CLF-C02"] = new(new Dictionary<string, double>
        {
            ["Cloud Concepts"] = 0.24,
            ["Security and Compliance"] = 0.30,
            ["Cloud Technology and Services"] = 0.34,
            ["Billing, Pricing, and Support"] = 0.12,
        }, 700, Guides + "cloud-practitioner-02/cloud-practitioner-02.html"),

        ["SAA-C03"] = new(new Dictionary<string, double>
        {
            ["Design Secure Architectures"] = 0.30,
            ["Design Resilient Architectures"] = 0.26,
            ["Design High-Performing Architectures"] = 0.24,
            ["Design Cost-Optimized Architectures"] = 0.20,
        }, 720, Guides + "solutions-architect-associate-03/solutions-architect-associate-03.html"),

        ["DVA-C02"] = new(new Dictionary<string, double>
        {
            ["Development with AWS Services"] = 0.32,
            ["Security"] = 0.26,
            ["Deployment"] = 0.24,
            ["Troubleshooting and Optimization"] = 0.18,
        }, 720, Guides + "developer-associate-02/developer-associate-02.html"),

        ["SOA-C03"] = new(new Dictionary<string, double>
        {
            ["Monitoring, Logging, Analysis, Remediation, and Performance Optimization"] = 0.22,
            ["Reliability and Business Continuity"] = 0.22,
            ["Deployment, Provisioning, and Automation"] = 0.22,
            ["Security and Compliance"] = 0.16,
            ["Networking and Content Delivery"] = 0.18,
        }, 720, Guides + "sysops-administrator-associate-03/sysops-administrator-associate-03.html"),

        ["ANS-C01"] = new(new Dictionary<string, double>
        {
            ["Network Design"] = 0.30,
            ["Network Implementation"] = 0.26,
            ["Network Management and Operation"] = 0.20,
            ["Network Security, Compliance, and Governance"] = 0.24,
        }, 750, Guides + "advanced-networking-specialty-01/advanced-networking-specialty-01.html"),

        ["SCS-C03"] = new(new Dictionary<string, double>
        {
            ["Detection"] = 0.16,
            ["Incident Response"] = 0.14,
            ["Infrastructure Security"] = 0.18,
            ["Identity and Access Management"] = 0.20,
            ["Data Protection"] = 0.18,
            ["Security Foundations and Governance"] = 0.14,
        }, 750, Guides + "security-specialty-03/security-specialty-03.html"),

        ["SAP-C02"] = new(new Dictionary<string, double>
        {
            ["Design Solutions for Organizational Complexity"] = 0.26,
            ["Design for New Solutions"] = 0.29,
            ["Continuous Improvement for Existing Solutions"] = 0.25,
            ["Accelerate Workload Migration and Modernization"] = 0.20,
        }, 750, Guides + "solutions-architect-professional-02/solutions-architect-professional-02.html"),

        ["DOP-C02"] = new(new Dictionary<string, double>
        {
            ["SDLC Automation"] = 0.22,
            ["Configuration Management and IaC"] = 0.17,
            ["Resilient Cloud Solutions"] = 0.15,
            ["Monitoring and Logging"] = 0.15,
            ["Incident and Event Response"] = 0.14,
            ["Security and Compliance"] = 0.17,
        }, 750, Guides + "devops-engineer-professional-02/devops-engineer-professional-02.html"),

        ["AIF-C01"] = new(new Dictionary<string, double>
        {
            ["Fundamentals of AI and ML"] = 0.20,
            ["Fundamentals of GenAI"] = 0.24,
            ["Applications of Foundation Models"] = 0.28,
            ["Guidelines for Responsible AI"] = 0.14,
            ["Security, Compliance, and Governance for AI Solutions"] = 0.14,
        }, 700, Guides + "ai-practitioner-01/ai-practitioner-01.html"),

        ["DEA-C01"] = new(new Dictionary<string, double>
        {
            ["Data Ingestion and Transformation"] = 0.34,
            ["Data Store Management"] = 0.26,
            ["Data Operations and Support"] = 0.22,
            ["Data Security and Governance"] = 0.18,
        }, 720, Guides + "data-engineer-associate-01/data-engineer-associate-01.html"),

        // The "(ML)" in domain 1 is part of the official domain title and must match the
        // question bank's Domain values verbatim, or the domain scores zero weight.
        ["MLA-C01"] = new(new Dictionary<string, double>
        {
            ["Data Preparation for Machine Learning (ML)"] = 0.28,
            ["ML Model Development"] = 0.26,
            ["Deployment and Orchestration of ML Workflows"] = 0.22,
            ["ML Solution Monitoring, Maintenance, and Security"] = 0.24,
        }, 720, Guides + "machine-learning-engineer-associate-01/machine-learning-engineer-associate-01.html"),
    };
}

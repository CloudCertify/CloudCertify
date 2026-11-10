namespace API.Services.Grading;

/// <summary>
/// Scores an Exam the way AWS does: per-Domain fraction correct, weighted by the exam guide's
/// content-Domain weights, scaled to the 100-1000 band. A Domain the guide does not list counts
/// in the raw tally but adds no weight and no breakdown row.
/// </summary>
/// <example><c>new WeightedDomainScoring(ExamWeightings.BySlug["SAA-C03"]).Score(questions)</c></example>
public class WeightedDomainScoring(ExamWeighting weighting) : IScoringRule
{
    /// <inheritdoc />
    public GradingResult Score(IReadOnlyList<GradedQuestion> questions)
    {
        var breakdown = weighting.DomainWeights
            .Select(w => Tally(w.Key, w.Value, questions))
            .Where(d => d.Total > 0)
            .ToList();

        double weightedFraction = breakdown.Sum(d => (double)d.Correct / d.Total * d.Weight);
        int scaledScore = (int)Math.Round(100 + weightedFraction * 900);

        return new GradingResult(scaledScore, scaledScore >= weighting.PassingScaledScore,
            questions.Count(q => q.IsCorrect), questions.Count, breakdown, weighting.PassingScaledScore);
    }

    private static DomainResult Tally(string domain, double weight, IReadOnlyList<GradedQuestion> questions)
    {
        var inDomain = questions.Where(q => q.Domain == domain).ToList();
        return new DomainResult(domain, inDomain.Count(q => q.IsCorrect), inDomain.Count, weight);
    }
}

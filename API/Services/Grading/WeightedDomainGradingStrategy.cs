using API.Entities;
using API.Model.Request;

namespace API.Services.Grading;

/// <summary>
/// Grades a full exam the way AWS does: per-domain fraction correct, weighted by the
/// official content-domain weightings from the exam guide, scaled to the 100-1000 band.
/// Exam-specific subclasses supply the weights and passing score.
/// Usage: <c>new SaaC03GradingStrategy().Grade(questions, answers)</c>.
/// </summary>
public abstract class WeightedDomainGradingStrategy : IGradingStrategy
{
    private readonly IReadOnlyDictionary<string, double> _domainWeights;
    private readonly int _passingScaledScore;

    protected WeightedDomainGradingStrategy(
        IReadOnlyDictionary<string, double> domainWeights,
        int passingScaledScore)
    {
        double weightSum = domainWeights.Values.Sum();
        if (Math.Abs(weightSum - 1.0) > 0.001)
            throw new ArgumentException(
                $"Domain weights sum to {weightSum.ToString(System.Globalization.CultureInfo.InvariantCulture)}; expected 1.0 (100% of scored content).",
                nameof(domainWeights));

        _domainWeights = domainWeights;
        _passingScaledScore = passingScaledScore;
    }

    public GradingResult Grade(IEnumerable<Question> questions, List<QuizAnswer> userAnswers)
    {
        var domainStats = TallyDomains(questions, userAnswers);

        int totalCorrect = domainStats.Values.Sum(s => s.correct);
        int totalQuestions = domainStats.Values.Sum(s => s.total);

        int scaledScore = (int)Math.Round(100 + ComputeWeightedFraction(domainStats) * 900);
        bool passed = scaledScore >= _passingScaledScore;

        return new GradingResult(scaledScore, passed, totalCorrect, totalQuestions,
            BuildBreakdown(domainStats));
    }

    private static Dictionary<string, (int correct, int total)> TallyDomains(
        IEnumerable<Question> questions, List<QuizAnswer> userAnswers)
    {
        var domainStats = new Dictionary<string, (int correct, int total)>();

        foreach (var question in questions)
        {
            var selectedIds = userAnswers
                .Where(a => a.QuestionId == question.Id)
                .SelectMany(a => a.AnswerIds)
                .ToList();

            bool isCorrect = QuestionCorrectness.IsCorrect(question, selectedIds);

            string domain = question.Domain ?? "Unknown";
            var (correct, total) = domainStats.GetValueOrDefault(domain);
            domainStats[domain] = (isCorrect ? correct + 1 : correct, total + 1);
        }

        return domainStats;
    }

    private double ComputeWeightedFraction(
        Dictionary<string, (int correct, int total)> domainStats)
    {
        double weightedFraction = 0;
        foreach (var (domain, weight) in _domainWeights)
        {
            if (!domainStats.TryGetValue(domain, out var stat) || stat.total == 0)
                continue;
            weightedFraction += (double)stat.correct / stat.total * weight;
        }

        return weightedFraction;
    }

    private List<DomainResult> BuildBreakdown(
        Dictionary<string, (int correct, int total)> domainStats)
    {
        return _domainWeights.Keys
            .Where(domainStats.ContainsKey)
            .Select(d =>
            {
                var (correct, total) = domainStats[d];
                return new DomainResult(d, correct, total, _domainWeights[d]);
            })
            .ToList();
    }
}

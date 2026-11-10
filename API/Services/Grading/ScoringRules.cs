using API.Entities;

namespace API.Services.Grading;

/// <summary>Picks the scoring rule for an attempt from its Mode and Quiz.</summary>
public static class ScoringRules
{
    /// <summary>
    /// Practice is a plain 0-100 percentage whatever the Drill: grading follows Mode, not which
    /// Drill was picked (ADR 0010, issue #10). An Exam uses its Quiz's Exam Weighting, or the flat
    /// 100-1000 band when none is on file.
    /// </summary>
    /// <example><c>ScoringRules.For(Mode.Exam, quiz).Score(questions)</c></example>
    public static IScoringRule For(Mode mode, Quiz quiz)
    {
        if (mode == Mode.Practice)
            return new FlatScoring(floor: 0, ceiling: 100, passingScore: 70);

        return ExamWeightings.BySlug.TryGetValue(quiz.Slug, out var weighting)
            ? new WeightedDomainScoring(weighting)
            : new FlatScoring(floor: 100, ceiling: 1000, passingScore: 700);
    }
}

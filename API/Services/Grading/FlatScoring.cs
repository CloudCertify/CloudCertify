namespace API.Services.Grading;

/// <summary>
/// Maps the fraction of Questions correct linearly onto [floor, ceiling], ignoring Domains.
/// Practice is <c>new FlatScoring(0, 100, 70)</c>; an Exam on a Quiz with no Exam Weighting is
/// <c>new FlatScoring(100, 1000, 700)</c>.
/// </summary>
public class FlatScoring(int floor, int ceiling, int passingScore) : IScoringRule
{
    /// <inheritdoc />
    public GradingResult Score(IReadOnlyList<GradedQuestion> questions)
    {
        int correct = questions.Count(q => q.IsCorrect);
        int score = questions.Count > 0
            ? (int)Math.Round(floor + (double)correct * (ceiling - floor) / questions.Count)
            : floor;

        return new GradingResult(score, score >= passingScore, correct, questions.Count, [], passingScore);
    }
}

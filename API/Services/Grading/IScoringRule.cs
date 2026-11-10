namespace API.Services.Grading;

/// <summary>
/// One served Question as grading sees it: its Domain and the verdict stamped on its Recorded
/// Answer when it was committed. No answer key, so a key fixed mid-attempt cannot move the Score
/// (ADR 0007).
/// </summary>
public record GradedQuestion(string? Domain, bool IsCorrect);

/// <summary>Turns an attempt's graded Questions into a result. Picked by <see cref="ScoringRules.For"/>.</summary>
public interface IScoringRule
{
    GradingResult Score(IReadOnlyList<GradedQuestion> questions);
}

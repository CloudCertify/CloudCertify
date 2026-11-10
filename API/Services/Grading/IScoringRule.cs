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
    /// <summary>
    /// Scores the served Questions of one attempt. Every served Question must be present, an
    /// unanswered one as <c>IsCorrect: false</c>, so the denominator is the served count (ADR 0001).
    /// </summary>
    /// <example><c>rule.Score([new GradedQuestion("Security", IsCorrect: true)])</c></example>
    GradingResult Score(IReadOnlyList<GradedQuestion> questions);
}

namespace API.Services.Drills;

/// <summary>
/// A User's latest evidence on one Question, read from their finished Submissions across both
/// Exam and Practice attempts alike — the most recent attempt wins outright. Correctness alone decides
/// it; Confidence does not (ADR 0008).
/// </summary>
public enum Outcome
{
    /// <summary>Never served to this User in a finished attempt. The default for everyone with no history.</summary>
    Unseen,

    /// <summary>
    /// Answered wrongly in the latest finished attempt that served it — or served and left with no
    /// Recorded Answer at all, which grading already treats as wrong (ADR 0001).
    /// </summary>
    Missed,

    /// <summary>Answered correctly in the latest finished attempt that served it.</summary>
    Mastered,
}

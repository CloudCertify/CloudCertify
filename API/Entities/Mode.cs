namespace API.Entities;

/// <summary>
/// Which attempt shape a Submission is, and the sole discriminator for the forked
/// behaviours — draw, feedback timing, grading, mutability, Confidence, Navigator
/// (ADR 0010). Held by the start paths: Practice starts from exactly one Drill, Exam
/// starts from the full Quiz with no Drill.
/// </summary>
public enum Mode
{
    /// <summary>Drill attempt: per-Question Check with instant feedback, immutable Recorded Answers, 0-100 score.</summary>
    Practice,

    /// <summary>Full-Quiz attempt: deferred correctness, revisable answers, Confidence, Scaled Score.</summary>
    Exam,
}

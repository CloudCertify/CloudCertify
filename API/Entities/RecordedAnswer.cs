using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

/// <summary>
/// One Question's selected answers committed to a Submission. Its lifecycle follows the
/// attempt type: in a Subquiz it is committed at Check and is immutable (a Check is final);
/// in a full Quiz it is committed as the visitor answers and stays revisable until Submit,
/// because the Navigator allows returning to any Question. Either way, the Recorded Answers
/// on a Submission are what its final score is computed from.
/// See docs/adr/0002-incremental-subquiz-feedback.md and docs/adr/0006-full-quiz-incremental-answers-and-confidence.md.
/// </summary>
[Table("RecordedAnswer")]
public class RecordedAnswer
{
    public int SubmissionId { get; set; }

    public int QuestionId { get; set; }

    public List<int> SelectedAnswerIds { get; set; } = new();

    /// <summary>
    /// How sure the visitor was, committed alongside the answer in a full Quiz and revised with
    /// it. Null when unrated — rating is optional and never blocks Submit — and always null for
    /// a Subquiz, which collects no Confidence (ADR 0006).
    /// </summary>
    public Confidence? Confidence { get; set; }

    /// <summary>
    /// Whether the selection was correct, judged when the answer was committed — at Check in a
    /// Subquiz, at answer-commit in a full Quiz, re-stamped on revision until Submit — and never
    /// re-judged afterwards, so fixing a Question's answer key cannot rewrite what the visitor
    /// knew at the time (ADR 0007). Null only on answers recorded before this was stamped; those
    /// are not backfilled. Never an input to a score: grading re-judges at Submit (ADR 0001).
    /// </summary>
    public bool? IsCorrect { get; set; }
}

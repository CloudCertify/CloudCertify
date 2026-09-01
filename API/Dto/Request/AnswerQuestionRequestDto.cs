using API.Entities;

namespace API.Model.Request;

/// <summary>
/// Commits one full-Quiz Question's selected answers as the visitor answers it. Carries the
/// Submission it belongs to, the Question being answered, and the selected answer ids.
/// Revisable: re-sending it for the same Question overwrites the previous Recorded Answer
/// (ADR 0006). Unlike a Practice Check, the response reveals nothing about correctness.
/// </summary>
public class AnswerQuestionRequestDto
{
    public int SubmissionId { get; set; }
    public int QuestionId { get; set; }
    public List<int> AnswerIds { get; set; } = new();

    /// <summary>
    /// Optional self-reported certainty. Omit it (or send null) to leave the Question unrated —
    /// rating never blocks Submit and never affects the score (ADR 0006).
    /// </summary>
    public Confidence? Confidence { get; set; }
}

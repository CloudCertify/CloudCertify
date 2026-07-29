namespace API.Model.Request;

/// <summary>
/// Commits one full-Quiz Question's selected answers as the visitor answers it. Carries the
/// Submission it belongs to, the Question being answered, and the selected answer ids.
/// Revisable: re-sending it for the same Question overwrites the previous Recorded Answer
/// (ADR 0006). Unlike a Subquiz Check, the response reveals nothing about correctness.
/// </summary>
public class AnswerQuestionRequestDto
{
    public int SubmissionId { get; set; }
    public int QuestionId { get; set; }
    public List<int> AnswerIds { get; set; } = new();
}

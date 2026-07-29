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
}

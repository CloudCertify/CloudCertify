namespace API.Model.Request;

/// <summary>
/// Finishes a full Quiz attempt. Carries only the Submission: grading reads the Recorded
/// Answers committed during the attempt, so the body cannot restate what was answered (ADR 0006).
/// </summary>
public class SubmitQuizRequestDto
{
    public int SubmissionId { get; set; }
}
public class QuizAnswer
{
    public int QuestionId { get; set; }
    public List<int> AnswerIds { get; set; } = new();
}
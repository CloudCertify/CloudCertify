namespace API.Model.Request;

/// <summary>
/// Commits one Practice Question's selected answers (a Check). Carries the Submission it
/// belongs to, the Question being answered, and the selected answer ids.
/// </summary>
public class CheckAnswerRequestDto
{
    public int SubmissionId { get; set; }
    public int QuestionId { get; set; }
    public List<int> AnswerIds { get; set; } = new();
}

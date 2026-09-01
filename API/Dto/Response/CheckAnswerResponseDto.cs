namespace API.Model.Response;

/// <summary>
/// Instant feedback for a single Checked Practice Question: whether the selection was
/// correct, the correct answer ids, what the learner picked, and the explanation.
/// </summary>
public class CheckAnswerResponseDto
{
    public required bool IsCorrect { get; set; }
    public required List<int> CorrectAnswerIds { get; set; }
    public required List<int> SelectedAnswerIds { get; set; }
    public string? Explanation { get; set; }
}

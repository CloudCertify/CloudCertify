namespace API.Dto;

public class SubquizDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Domain { get; set; }
    public string Slug { get; set; }
    public int SubmissionId { get; set; }
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// The drill's make-up for a logged-in User; null for an anonymous visitor, whose drill is
    /// still a uniform random draw (ADR 0008).
    /// </summary>
    public DrillCompositionDto? Composition { get; init; }

    public ICollection<QuestionDto> Questions { get; set; }
}

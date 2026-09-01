using API.Entities;

namespace API.Dto;

public class DrillDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    /// <summary>Null for a Drill that draws across the whole parent Quiz (ADR 0010).</summary>
    public string? Domain { get; set; }
    public DrawRule DrawRule { get; set; }
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

namespace API.Dto;

/// <summary>
/// One Domain's Standing on a Quiz: Mastered / seen as a percent, plus movement
/// since the previous finished Exam. Delta is null until a second Exam exists
/// and must not be sent as 0 in that case (issue #61).
/// </summary>
public class DomainStandingDto
{
    public required string Name { get; set; }
    public required int Standing { get; set; }
    public required int Seen { get; set; }
    public required int? Delta { get; set; }
}

/// <summary>One finished Exam on the trend line: percent correct of that attempt, not Scaled Score.</summary>
public class TrendPointDto
{
    public required int SubmissionId { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required int Percent { get; set; }
}

/// <summary>
/// Per-you Progress on one Quiz. Domains are latest-attempt-wins, same fold as
/// <c>OutcomeSnapshot</c>. Trend is the newest 10 finished Exams only.
/// </summary>
public class ProgressDto
{
    public required List<DomainStandingDto> Domains { get; set; }
    public required List<TrendPointDto> Trend { get; set; }
    public required int FinishedExams { get; set; }
    public required int FinishedDrills { get; set; }

    /// <summary>
    /// Weakest Domain with at least 5 seen Questions, or null when none qualify
    /// and the page should invite another attempt instead.
    /// </summary>
    public required string? Lead { get; set; }
}

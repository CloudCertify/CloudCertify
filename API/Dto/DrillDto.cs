using API.Entities;

namespace API.Dto;

public class DrillDto
{
    public required int Id { get; set; }
    public required string Title { get; set; }
    /// <summary>Null for a Drill that draws across the whole parent Quiz (ADR 0010).</summary>
    public required string? Domain { get; set; }
    public required DrawRule DrawRule { get; set; }
    public required string Slug { get; set; }
    public required bool IsAvailable { get; set; }
}

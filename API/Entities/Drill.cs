using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

/// <summary>
/// A named selector over a parent Quiz's Questions: catalog identity (Title, Slug,
/// IsAvailable, linkable route) plus the rule that picks the questions at attempt start.
/// A Drill never owns Questions — they belong to the Quiz via <see cref="Question.QuizId"/>
/// (ADR 0010).
/// </summary>
[Table("Drill")]
public class Drill
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }

    public int QuizId { get; set; }

    public string Title { get; set; }

    /// <summary>
    /// Domain this Drill is scoped to, or null for a Drill that draws across the whole
    /// parent Quiz (the Mistakes Drill — ADR 0010, ADR 0011).
    /// </summary>
    public string? Domain { get; set; }

    /// <summary>How this Drill picks its Questions out of its scope.</summary>
    public DrawRule DrawRule { get; set; } = DrawRule.DrillMix;

    public string Slug { get; set; }

    public bool IsAvailable { get; set; } = false;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public virtual Quiz Quiz { get; set; }
}

/// <summary>
/// How a Drill chooses which of its scope's Questions to serve (ADR 0010). There is no
/// LowConfidence rule: the review draw is one rule named Mistakes (ADR 0011).
/// </summary>
public enum DrawRule
{
    /// <summary>Plain random draw, no Outcomes read.</summary>
    Uniform,

    /// <summary>Outcome-driven Missed/Unseen/Mastered mix over one Domain (ADR 0008).</summary>
    DrillMix,

    /// <summary>
    /// Cross-Domain review of what the User got wrong or was unsure of: the union of Missed
    /// Outcomes and Guess/Unsure ratings, capped at 15 and never padded (ADR 0011).
    /// </summary>
    Mistakes,
}

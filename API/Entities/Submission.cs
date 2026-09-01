using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

[Table("Submission")]
public class Submission
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }
    
    public int QuizId { get; set; }

    /// <summary>
    /// The Drill this attempt was started from. Set for <see cref="Entities.Mode.Practice"/>,
    /// null for <see cref="Entities.Mode.Exam"/> — but never the behaviour discriminator:
    /// that is <see cref="Mode"/> (ADR 0010).
    /// </summary>
    public int? DrillId { get; set; }

    /// <summary>
    /// Which attempt shape this is. Sole discriminator for draw, feedback timing, grading,
    /// mutability, Confidence and Navigator (ADR 0010).
    /// </summary>
    public Mode Mode { get; set; }

    public bool Finished { get; set; }

    /// <summary>
    /// Question IDs served to the client at start time. Grading runs
    /// against this fixed set so skipped questions count as wrong and the denominator is
    /// stable regardless of what the client submits. See docs/adr/0001-server-authoritative-attempts.md.
    /// </summary>
    public List<int> ServedQuestionIds { get; set; } = new();

    /// <summary>
    /// Per-Question answers committed during the attempt, and the only thing its final score is
    /// graded from. Practice commits them at Check and they are immutable; Exam commits
    /// them as the visitor answers and they are overwritten on re-answer until Submit.
    /// See docs/adr/0002-incremental-subquiz-feedback.md and docs/adr/0006-full-quiz-incremental-answers-and-confidence.md.
    /// </summary>
    public List<RecordedAnswer> RecordedAnswers { get; set; } = new();

    public int Score { get; set; }

    /// <summary>
    /// Language the attempt is served in, resolved from Accept-Language at start and fixed
    /// for the Submission's whole life — Check/Submit ignore the current header (ADR 0004).
    /// </summary>
    public Language Language { get; set; } = Language.EnUs;

    /// <summary>
    /// Self-reported email of an Anonymous Submission. Born with exactly one of Email/UserId;
    /// a Claimed submission keeps its Email for provenance and gains a UserId (ADR 0003).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>Owning User for a logged-in attempt, or set later by Claiming. Null when anonymous.</summary>
    public int? UserId { get; set; }
    
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
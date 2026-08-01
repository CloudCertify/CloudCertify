using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

/// <summary>
/// A visitor's claim that a Question's content is defective. Keyed by
/// (SubmissionId, QuestionId) exactly like <see cref="RecordedAnswer"/>: a Report always
/// hangs off a Check, so it carries the reporter's answer as evidence and a Submission can
/// file at most one Report per Question. Never re-grades a Submission and stores no copy of
/// the reported content — see docs/adr/0005-reports-flag-question-defects.md.
/// </summary>
[Table("Report")]
public class Report
{
    public int SubmissionId { get; set; }

    public int QuestionId { get; set; }

    /// <summary>What is wrong with the Question; at least one, deduplicated.</summary>
    public List<ReportReason> Reasons { get; set; } = new();

    /// <summary>Optional free text, at most 200 characters.</summary>
    public string? Comment { get; set; }

    /// <summary>
    /// The reporter's proposed correction, or null when they only filed a claim. A sparse patch
    /// against the Question as served — never applied automatically
    /// (see docs/adr/0009-reports-carry-suggested-edits.md).
    /// </summary>
    public ReportSuggestion? Suggestion { get; set; }

    /// <summary>
    /// Copied from the Submission so the Report names which language's text was defective;
    /// never read from the request (ADR 0004).
    /// </summary>
    public Language Language { get; set; } = Language.EnUs;

    /// <summary>Triage memory across passes; every Report is born <see cref="ReportStatus.Open"/>.</summary>
    public ReportStatus Status { get; set; } = ReportStatus.Open;

    /// <summary>
    /// Stamped by the database, like <see cref="Question.UpdatedAt"/>, so comparing the two to
    /// spot a stale Report does not straddle two clocks (ADR 0005).
    /// </summary>
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Why a Question's content is defective. There is deliberately no BadTranslation:
/// <see cref="Report.Language"/> plus <see cref="UnclearWording"/> already points at the
/// pt-BR text (ADR 0005).
/// </summary>
public enum ReportReason
{
    WrongAnswerKey,
    UnclearWording,
    BadExplanation,
    Outdated,
}

/// <summary>
/// A reporter's proposed correction, stored as a sparse patch: only the fields they actually
/// changed are present, so this is a diff and not the content snapshot ADR 0005 ruled out.
/// The patched text belongs to the Report's <see cref="Report.Language"/> (ADR 0004).
/// </summary>
public class ReportSuggestion
{
    /// <summary>Proposed question text; null leaves it alone.</summary>
    public string? QuestionText { get; set; }

    /// <summary>Only the answers the reporter touched; empty when they changed none.</summary>
    public List<AnswerSuggestion> Answers { get; set; } = new();
}

/// <summary>A proposed change to one Answer. Every field but the id is optional.</summary>
public class AnswerSuggestion
{
    public int AnswerId { get; set; }

    /// <summary>Proposed answer text; null leaves it alone.</summary>
    public string? Text { get; set; }

    /// <summary>Proposed correctness; null leaves it alone.</summary>
    public bool? IsCorrect { get; set; }
}

/// <summary>Triage state of a Report. Editing the Question is the bulk resolution path (ADR 0005).</summary>
public enum ReportStatus
{
    Open,
    Resolved,
    Rejected,
}

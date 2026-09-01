using API.Entities;

namespace API.Model.Request;

/// <summary>
/// Files a Report against a Practice Question the Submission has already Checked.
/// The Report's Language comes from the Submission, so it is deliberately not part of
/// this body (ADR 0004).
/// </summary>
public class CreateReportRequestDto
{
    public int SubmissionId { get; set; }
    public int QuestionId { get; set; }

    /// <summary>At least one reason; duplicates are collapsed.</summary>
    public List<ReportReason> Reasons { get; set; } = new();

    /// <summary>Optional free text, at most 200 characters.</summary>
    public string? Comment { get; set; }

    /// <summary>
    /// Optional proposed correction. Only the fields the reporter changed need to be sent;
    /// it is stored for a human to read and never applied automatically (ADR 0009).
    /// </summary>
    public SuggestionDto? Suggestion { get; set; }
}

/// <summary>A proposed correction to the Question, in the Submission's Language (ADR 0004).</summary>
public class SuggestionDto
{
    /// <summary>Proposed question text; omit to leave it alone.</summary>
    public string? QuestionText { get; set; }

    /// <summary>Only the answers being changed.</summary>
    public List<AnswerSuggestionDto> Answers { get; set; } = new();
}

/// <summary>A proposed change to one Answer of the reported Question.</summary>
public class AnswerSuggestionDto
{
    public int AnswerId { get; set; }

    /// <summary>Proposed answer text; omit to leave it alone.</summary>
    public string? Text { get; set; }

    /// <summary>Proposed correctness; omit to leave it alone.</summary>
    public bool? IsCorrect { get; set; }
}

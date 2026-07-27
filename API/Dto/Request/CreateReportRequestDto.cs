using API.Entities;

namespace API.Model.Request;

/// <summary>
/// Files a Report against a Subquiz Question the Submission has already Checked.
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
}

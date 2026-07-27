using API.Entities;

namespace API.Model.Response;

/// <summary>The Report as persisted, echoed back on a successful file.</summary>
public class ReportResponseDto
{
    public required int SubmissionId { get; set; }
    public required int QuestionId { get; set; }
    public required List<ReportReason> Reasons { get; set; }
    public string? Comment { get; set; }

    /// <summary>Taken from the Submission, never from the request.</summary>
    public required Language Language { get; set; }

    public required ReportStatus Status { get; set; }
    public required DateTime CreatedAt { get; set; }
}

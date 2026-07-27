using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;

namespace API.Services;

/// <summary>Why a <see cref="ReportService.FileReport"/> call ended the way it did.</summary>
public enum ReportOutcome
{
    Filed,
    SubmissionNotFound,
    NotSubquiz,
    NotChecked,
    NoReasons,
    CommentTooLong,
    AlreadyReported,
}

/// <summary>Outcome of filing a Report, plus the persisted Report when it was <see cref="ReportOutcome.Filed"/>.</summary>
public record ReportResult(ReportOutcome Outcome, string? Message = null, ReportResponseDto? Report = null);

/// <summary>
/// Files Reports against defective Question content. A Report hangs off an existing Recorded
/// Answer — that pairing is both the evidence and the anti-abuse gate, which is why anonymous
/// visitors may report. Never touches the Submission's grade
/// (see docs/adr/0005-reports-flag-question-defects.md).
/// </summary>
public class ReportService(ISubmissionRepository submissionRepository, IReportRepository reportRepository)
{
    /// <summary>Maximum length of the optional free-text comment.</summary>
    public const int MaxCommentLength = 200;

    /// <summary>
    /// Validates and persists a Report. Rejects a missing Submission, a full-Quiz Submission
    /// (Subquiz only for now), a Question the Submission never Checked, an empty reason set,
    /// an over-long comment, and a second Report for the same (Submission, Question).
    /// </summary>
    /// <example><code>var result = await reportService.FileReport(request);</code></example>
    public async Task<ReportResult> FileReport(CreateReportRequestDto request)
    {
        var reasons = request.Reasons.Distinct().ToList();
        var invalid = ValidateRequest(reasons, request.Comment);
        if (invalid != null)
        {
            return invalid;
        }

        var submission = await submissionRepository.GetById(request.SubmissionId);
        var ineligible = CheckEligibility(submission, request.SubmissionId, request.QuestionId);
        if (ineligible != null)
        {
            return ineligible;
        }

        var report = await reportRepository.Create(new Report
        {
            SubmissionId = request.SubmissionId,
            QuestionId = request.QuestionId,
            Reasons = reasons,
            Comment = request.Comment,
            // Copied from the Submission; any client-supplied language is ignored (ADR 0004).
            Language = submission!.Language,
            Status = ReportStatus.Open,
        });

        // Null means the primary key already held a Report for this Recorded Answer.
        return report == null
            ? new ReportResult(ReportOutcome.AlreadyReported,
                $"Question {request.QuestionId} is already reported on submission {request.SubmissionId}")
            : new ReportResult(ReportOutcome.Filed, Report: ToDto(report));
    }

    /// <summary>Request-only checks: a non-empty set of known reasons and a short-enough comment.</summary>
    private static ReportResult? ValidateRequest(List<ReportReason> reasons, string? comment)
    {
        if (reasons.Count == 0 || reasons.Any(r => !Enum.IsDefined(r)))
        {
            return new ReportResult(ReportOutcome.NoReasons, "At least one known reason is required");
        }

        return comment is { Length: > MaxCommentLength }
            ? new ReportResult(ReportOutcome.CommentTooLong,
                $"Comment must be at most {MaxCommentLength} characters")
            : null;
    }

    /// <summary>
    /// Whether this Submission may report this Question: it must exist, be a Subquiz attempt
    /// (full-Quiz reporting is deferred, and the restriction lives here rather than in the URL),
    /// and already carry a Recorded Answer for the Question (ADR 0005).
    /// </summary>
    private static ReportResult? CheckEligibility(Submission? submission, int submissionId, int questionId)
    {
        if (submission == null)
        {
            return new ReportResult(ReportOutcome.SubmissionNotFound, $"Submission {submissionId} not found");
        }

        if (submission.SubquizId == null)
        {
            return new ReportResult(ReportOutcome.NotSubquiz, "Reports can only be filed from a subquiz attempt");
        }

        // No Recorded Answer means the Question was never Checked on this Submission —
        // either not answered yet or never served.
        return submission.RecordedAnswers.All(r => r.QuestionId != questionId)
            ? new ReportResult(ReportOutcome.NotChecked,
                $"Question {questionId} has not been checked on submission {submissionId}")
            : null;
    }

    private static ReportResponseDto ToDto(Report report) => new()
    {
        SubmissionId = report.SubmissionId,
        QuestionId = report.QuestionId,
        Reasons = report.Reasons,
        Comment = report.Comment,
        Language = report.Language,
        Status = report.Status,
        CreatedAt = report.CreatedAt,
    };
}

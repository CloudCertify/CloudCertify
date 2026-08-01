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
    InvalidSuggestion,
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
public class ReportService(
    ISubmissionRepository submissionRepository,
    IReportRepository reportRepository,
    IQuestionRepository questionRepository)
{
    /// <summary>Maximum length of the optional free-text comment.</summary>
    public const int MaxCommentLength = 200;

    /// <summary>
    /// Maximum length of any single suggested text. Anonymous reporters can now send several
    /// fields of free text instead of one short comment, so the size cap does the work the
    /// 200-char comment used to do (ADR 0009).
    /// </summary>
    public const int MaxSuggestedTextLength = 2000;

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

        ReportSuggestion? suggestion = null;
        if (request.Suggestion != null)
        {
            var question = (await questionRepository.GetQuestionsByIds([request.QuestionId]))
                .FirstOrDefault();
            var (rejected, patch) = BuildSuggestion(request.Suggestion, question);
            if (rejected != null)
            {
                return rejected;
            }

            suggestion = patch;
        }

        var report = await reportRepository.Save(new Report
        {
            SubmissionId = request.SubmissionId,
            QuestionId = request.QuestionId,
            Reasons = reasons,
            Comment = request.Comment,
            Suggestion = suggestion,
            // Copied from the Submission; any client-supplied language is ignored (ADR 0004).
            Language = submission!.Language,
            Status = ReportStatus.Open,
        });

        // Null means this Recorded Answer already holds a Report that has been triaged.
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

    /// <summary>
    /// Turns a suggestion request into the sparse patch that gets stored, or rejects it. A patch
    /// is only accepted if it can actually be applied: every answer belongs to the reported
    /// Question, texts are within the size cap, and any proposed key still has exactly as many
    /// correct answers as the Question's type allows (ADR 0009). Entries that change nothing are
    /// dropped, and a patch that changes nothing at all is stored as null.
    /// </summary>
    private static (ReportResult? Rejected, ReportSuggestion? Patch) BuildSuggestion(
        SuggestionDto request, Question? question)
    {
        if (question == null)
        {
            return (Invalid("Cannot suggest an edit for an unknown question"), null);
        }

        var questionText = Trimmed(request.QuestionText);
        if (TooLong(questionText))
        {
            return (Invalid($"Suggested text must be at most {MaxSuggestedTextLength} characters"), null);
        }

        var answers = new List<AnswerSuggestion>();
        foreach (var suggested in request.Answers)
        {
            var answer = question.Answers.FirstOrDefault(a => a.Id == suggested.AnswerId);
            if (answer == null)
            {
                return (Invalid($"Answer {suggested.AnswerId} does not belong to question {question.Id}"), null);
            }

            if (answers.Any(a => a.AnswerId == suggested.AnswerId))
            {
                return (Invalid($"Answer {suggested.AnswerId} was suggested twice"), null);
            }

            var text = Trimmed(suggested.Text);
            if (TooLong(text))
            {
                return (Invalid($"Suggested text must be at most {MaxSuggestedTextLength} characters"), null);
            }

            // A field that matches what is already stored is not a change worth keeping.
            var changedText = text != null && text != answer.Text ? text : null;
            var changedKey = suggested.IsCorrect != null && suggested.IsCorrect != answer.IsCorrect
                ? suggested.IsCorrect
                : null;

            if (changedText != null || changedKey != null)
            {
                answers.Add(new AnswerSuggestion
                {
                    AnswerId = suggested.AnswerId,
                    Text = changedText,
                    IsCorrect = changedKey,
                });
            }
        }

        var keyError = ValidateProposedKey(question, answers);
        if (keyError != null)
        {
            return (keyError, null);
        }

        var changedQuestionText = questionText != null && questionText != question.Text ? questionText : null;
        return changedQuestionText == null && answers.Count == 0
            ? (null, null)
            : (null, new ReportSuggestion { QuestionText = changedQuestionText, Answers = answers });
    }

    /// <summary>
    /// A proposed key must be applicable: one correct answer for a multiple choice Question,
    /// exactly SelectCount for a multiple response one. Rejected here rather than discovered
    /// during triage.
    /// </summary>
    private static ReportResult? ValidateProposedKey(Question question, List<AnswerSuggestion> answers)
    {
        if (answers.All(a => a.IsCorrect == null))
        {
            return null;
        }

        var correctCount = question.Answers.Count(answer =>
            answers.FirstOrDefault(a => a.AnswerId == answer.Id)?.IsCorrect ?? answer.IsCorrect);
        var expected = question.Type == QuestionType.MultipleResponse ? question.SelectCount : 1;

        return correctCount == expected
            ? null
            : new ReportResult(ReportOutcome.InvalidSuggestion,
                $"A suggested key must mark exactly {expected} answer(s) correct, not {correctCount}");
    }

    private static ReportResult Invalid(string message) =>
        new(ReportOutcome.InvalidSuggestion, message);

    private static string? Trimmed(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private static bool TooLong(string? text) => text is { Length: > MaxSuggestedTextLength };

    private static ReportResponseDto ToDto(Report report) => new()
    {
        SubmissionId = report.SubmissionId,
        QuestionId = report.QuestionId,
        Reasons = report.Reasons,
        Comment = report.Comment,
        Suggestion = report.Suggestion,
        Language = report.Language,
        Status = report.Status,
        CreatedAt = report.CreatedAt,
    };
}

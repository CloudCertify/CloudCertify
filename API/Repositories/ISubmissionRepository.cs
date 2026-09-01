using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for quiz <see cref="Submission"/>s (start, score, finish).</summary>
public interface ISubmissionRepository
{
    Task<Submission> Create(Submission submission);
    Task<Submission> Update(Submission submission);
    Task<Submission?> GetById(int submissionId);

    /// <summary>Persists one immutable <see cref="RecordedAnswer"/> committed via Check.</summary>
    Task RecordAnswer(RecordedAnswer recordedAnswer);

    /// <summary>
    /// Persists a full-Quiz <see cref="RecordedAnswer"/>, overwriting the Question's previous
    /// selection if it was already answered — a full Quiz's answers stay revisable until
    /// Submit because the Navigator allows returning to any Question (ADR 0006).
    /// </summary>
    Task SaveAnswer(RecordedAnswer recordedAnswer);

    /// <summary>
    /// Claiming: attaches anonymous Submissions matching any of the emails to the User.
    /// Keeps the original Email for provenance; idempotent (skips already-owned rows). ADR 0003.
    /// </summary>
    Task<int> ClaimAnonymousSubmissions(int userId, IReadOnlyCollection<string> emails);

    Task<List<Submission>> GetByUserId(int userId);

    /// <summary>
    /// Finished Submissions a User made on a Quiz — Exam and Practice alike — with their
    /// Recorded Answers. This is the evidence Outcomes are read from (ADR 0008); unfinished
    /// attempts are excluded at the source because they contribute nothing.
    /// </summary>
    Task<List<Submission>> GetFinishedByUserAndQuiz(int userId, int quizId);
}

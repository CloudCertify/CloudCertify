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
    /// Claiming: attaches anonymous Submissions matching any of the emails to the User.
    /// Keeps the original Email for provenance; idempotent (skips already-owned rows). ADR 0003.
    /// </summary>
    Task<int> ClaimAnonymousSubmissions(int userId, IReadOnlyCollection<string> emails);

    Task<List<Submission>> GetByUserId(int userId);
}

using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for question <see cref="Report"/>s. Triage happens out-of-band in SQL (ADR 0005).</summary>
public interface IReportRepository
{
    /// <summary>
    /// Persists a new Report, or returns null when this Submission already reported this Question.
    /// The primary key is the one-Report-per-Recorded-Answer limit, so the race between two
    /// concurrent files is settled by the database rather than by a check-then-insert.
    /// </summary>
    Task<Report?> Create(Report report);
}

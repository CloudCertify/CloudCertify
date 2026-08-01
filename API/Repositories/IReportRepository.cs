using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for question <see cref="Report"/>s. Triage happens out-of-band in SQL (ADR 0005).</summary>
public interface IReportRepository
{
    /// <summary>
    /// Persists a Report, replacing an existing one for the same (Submission, Question) while it
    /// is still <see cref="ReportStatus.Open"/> — a reporter who files a claim and then returns
    /// to suggest a fix must not be blocked by their own report (ADR 0009). Returns null once
    /// the existing Report has been triaged, and on the insert race, so both surface as a
    /// conflict. The primary key remains the one-Report-per-Recorded-Answer limit (ADR 0005).
    /// </summary>
    Task<Report?> Save(Report report);
}

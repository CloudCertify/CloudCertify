using API.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace API.Repositories;

public class ReportRepository(ApplicationDbContext context) : IReportRepository
{
    private const string UniqueViolation = "23505";

    public async Task<Report?> Save(Report report)
    {
        var existing = await context.Report.FirstOrDefaultAsync(r =>
            r.SubmissionId == report.SubmissionId && r.QuestionId == report.QuestionId);

        if (existing != null)
        {
            // Triaged reports are history: a second file is a conflict once someone has ruled
            // on the first. While Open, the newest version of the reporter's claim wins.
            if (existing.Status != ReportStatus.Open)
            {
                return null;
            }

            existing.Reasons = report.Reasons;
            existing.Comment = report.Comment;
            existing.Suggestion = report.Suggestion;
            await context.SaveChangesAsync();
            return existing;
        }

        try
        {
            await context.Report.AddAsync(report);
            await context.SaveChangesAsync();
            return report;
        }
        catch (DbUpdateException e) when ((e.InnerException as PostgresException)?.SqlState == UniqueViolation)
        {
            // Lost the race with a concurrent file; the database settles it rather than a
            // check-then-insert. Reported as a conflict, same as a triaged report.
            context.Entry(report).State = EntityState.Detached;
            return null;
        }
    }
}

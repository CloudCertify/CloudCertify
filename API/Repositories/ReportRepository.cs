using API.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace API.Repositories;

public class ReportRepository(ApplicationDbContext context) : IReportRepository
{
    private const string UniqueViolation = "23505";

    public async Task<Report?> Create(Report report)
    {
        try
        {
            await context.Report.AddAsync(report);
            await context.SaveChangesAsync();
            return report;
        }
        catch (DbUpdateException e) when ((e.InnerException as PostgresException)?.SqlState == UniqueViolation)
        {
            // The (SubmissionId, QuestionId) primary key is the duplicate-report guard.
            context.Entry(report).State = EntityState.Detached;
            return null;
        }
    }
}

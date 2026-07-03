using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Repositories;

public class SubmissionRepository(ApplicationDbContext context) : ISubmissionRepository
{
    public async Task<Submission> Create(Submission submission)
    {
        await context.Submission.AddAsync(submission);
        await context.SaveChangesAsync();
        return submission;
    }

    public async Task<Submission> Update(Submission submission)
    {
        context.Submission.Update(submission);
        await context.SaveChangesAsync();
        return submission;
    }
    
    public async Task<Submission?> GetById(int submissionId)
    {
        return await context.Submission
            .Include(s => s.RecordedAnswers)
            .FirstOrDefaultAsync(s => s.Id == submissionId);
    }

    public async Task RecordAnswer(RecordedAnswer recordedAnswer)
    {
        context.Set<RecordedAnswer>().Add(recordedAnswer);
        await context.SaveChangesAsync();
    }

    public async Task<int> ClaimAnonymousSubmissions(int userId, IReadOnlyCollection<string> emails)
    {
        return await context.Submission
            .Where(s => s.UserId == null && s.Email != null && emails.Contains(s.Email))
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.UserId, userId));
    }

    public async Task<List<Submission>> GetByUserId(int userId)
    {
        return await context.Submission
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }
}
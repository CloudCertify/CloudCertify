using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Repositories;

public class SubquizRepository(ApplicationDbContext context) : ISubquizRepository
{
    public async Task Create(Subquiz subquiz)
    {
        await context.Subquiz.AddAsync(subquiz);
        await context.SaveChangesAsync();
    }

    public async Task CreateMany(List<Subquiz> subquizzes)
    {
        await context.Subquiz.AddRangeAsync(subquizzes);
        await context.SaveChangesAsync();
    }

    public async Task<Subquiz?> GetSubquizById(int subquizId)
    {
        return await context.Subquiz
            .FirstOrDefaultAsync(sq => sq.Id == subquizId);
    }

    public async Task<List<Subquiz>> GetSubquizzesByQuizId(int quizId)
    {
        return await context.Subquiz
            .Where(sq => sq.QuizId == quizId)
            .ToListAsync();
    }

    public async Task UpdateMany(List<Subquiz> subquizzes)
    {
        context.Subquiz.UpdateRange(subquizzes);
        await context.SaveChangesAsync();
    }

    public async Task<List<Subquiz>> GetAllSubquizzes()
    {
        return await context.Subquiz.ToListAsync();
    }
}

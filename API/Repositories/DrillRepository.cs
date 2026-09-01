using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Repositories;

public class DrillRepository(ApplicationDbContext context) : IDrillRepository
{
    public async Task Create(Drill drill)
    {
        await context.Drill.AddAsync(drill);
        await context.SaveChangesAsync();
    }

    public async Task CreateMany(List<Drill> drills)
    {
        await context.Drill.AddRangeAsync(drills);
        await context.SaveChangesAsync();
    }

    public async Task<Drill?> GetDrillById(int drillId)
    {
        return await context.Drill
            .FirstOrDefaultAsync(sq => sq.Id == drillId);
    }

    public async Task<List<Drill>> GetDrillsByQuizId(int quizId)
    {
        return await context.Drill
            .Where(sq => sq.QuizId == quizId)
            .ToListAsync();
    }

    public async Task UpdateMany(List<Drill> drills)
    {
        context.Drill.UpdateRange(drills);
        await context.SaveChangesAsync();
    }

    public async Task<List<Drill>> GetAllDrills()
    {
        return await context.Drill.ToListAsync();
    }
}

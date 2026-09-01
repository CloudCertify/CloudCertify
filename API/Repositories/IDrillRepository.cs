using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for <see cref="Drill"/> rows (named selectors over a Quiz's Questions).</summary>
public interface IDrillRepository
{
    Task Create(Drill drill);
    Task CreateMany(List<Drill> drills);
    Task<Drill?> GetDrillById(int drillId);
    Task<List<Drill>> GetDrillsByQuizId(int quizId);
    Task<List<Drill>> GetAllDrills();
    Task UpdateMany(List<Drill> drills);
}

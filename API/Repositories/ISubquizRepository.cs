using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for <see cref="Subquiz"/> aggregates (domain-scoped practice sets).</summary>
public interface ISubquizRepository
{
    Task Create(Subquiz subquiz);
    Task CreateMany(List<Subquiz> subquizzes);
    Task<Subquiz?> GetSubquizById(int subquizId);
    Task<List<Subquiz>> GetSubquizzesByQuizId(int quizId);
    Task<List<Subquiz>> GetAllSubquizzes();
    Task UpdateMany(List<Subquiz> subquizzes);
}

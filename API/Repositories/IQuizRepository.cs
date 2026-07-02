using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for <see cref="Quiz"/> aggregates. Lets services be unit-tested against a mock.</summary>
public interface IQuizRepository
{
    Task Create(Quiz quiz);
    Task CreateMany(List<Quiz> quizzes);
    Task<Quiz?> GetQuizById(int quizId);
    Task<Quiz?> GetQuizBySlug(string slug);
    Task<List<Quiz>> GetQuizzes();
    Task ReplaceQuestions(int quizId, List<Question> questions, string questionsHash);
    Task Update(Quiz quiz);
}

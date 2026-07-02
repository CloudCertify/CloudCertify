using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Repositories;

public class QuizRepository(ApplicationDbContext context) : IQuizRepository
{
    public async Task Create(Quiz quiz)
    {
        await context.Quiz.AddAsync(quiz);
        await context.SaveChangesAsync();
    }
    
    public async Task CreateMany(List<Quiz> quizzes)
    {
        await context.Quiz.AddRangeAsync(quizzes);
        await context.SaveChangesAsync();
    }

    public async Task<Quiz?> GetQuizById(int quizId)
    {
        return await context.Quiz
            .Include(q => q.Questions)
            .ThenInclude(q => q.Answers)
            .Include(q => q.SubQuizzes)
            .FirstOrDefaultAsync(q => q.Id == quizId);
    }
    
    public async Task<Quiz?> GetQuizBySlug(string slug)
    {
        return await context.Quiz
            .Include(q => q.SubQuizzes)
            .FirstOrDefaultAsync(q => q.Slug == slug);
    }

    /// <summary>
    /// Deletes every existing question of the quiz (answers cascade) and inserts the
    /// given set, stamping the new questions-file hash. Used by seeding when the
    /// questions file changed on disk.
    /// </summary>
    public async Task ReplaceQuestions(int quizId, List<Question> questions, string questionsHash)
    {
        var quiz = await context.Quiz.FirstAsync(q => q.Id == quizId);
        var oldQuestions = context.Question.Where(q => q.QuizId == quizId);
        context.Question.RemoveRange(oldQuestions);

        foreach (var question in questions)
        {
            question.QuizId = quizId;
        }

        await context.Question.AddRangeAsync(questions);
        quiz.QuestionsHash = questionsHash;
        await context.SaveChangesAsync();
    }

    public async Task Update(Quiz quiz)
    {
        context.Quiz.Update(quiz);
        await context.SaveChangesAsync();
    }

    public async Task<List<Quiz>> GetQuizzes()
    {
        return await context.Quiz
            .Include(q => q.Questions)
            .Include(q => q.SubQuizzes)
            .ToListAsync();
    }
}
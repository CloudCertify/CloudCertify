using API.Entities;
using API.External;
using API.Repositories;
using Newtonsoft.Json;

namespace API.Tests.Services;

public class QuizCatalogSeederTests : IDisposable
{
    private static readonly string[] SeededFileSlugs =
        ["clf-c02", "dva-c02", "soa-c03", "saa-c03", "ans-c01", "scs-c03"];

    private readonly string _questionsDir =
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "External", "questions");

    private readonly InMemoryQuizRepository _quizzes = new();
    private readonly InMemorySubquizRepository _subquizzes = new();

    public QuizCatalogSeederTests()
    {
        Directory.CreateDirectory(_questionsDir);
        foreach (var slug in SeededFileSlugs)
        {
            WriteQuestionsFile(slug, BuildQuestionPayloads("Domain A", "Domain B"));
        }
    }

    public void Dispose() => Directory.Delete(_questionsDir, recursive: true);

    private QuizCatalogSeeder CreateSeeder() => new(_quizzes, _subquizzes);

    private void WriteQuestionsFile(string slug, List<QuestionPayload> payloads)
    {
        File.WriteAllText(Path.Combine(_questionsDir, $"{slug}.json"), JsonConvert.SerializeObject(payloads));
    }

    private static List<QuestionPayload> BuildQuestionPayloads(params string[] domains)
    {
        return domains.Select(domain => new QuestionPayload
        {
            Text = $"Question about {domain}?",
            Type = "multiple_choice",
            SelectCount = 1,
            Domain = domain,
            Difficulty = "hard",
            Answers = [new AnswerPayload { Text = "Yes", IsCorrect = true }]
        }).ToList();
    }

    [Fact]
    public async Task SeedCatalog_PopulatesQuizzesQuestionsAndDomainSubquizzes_OnFreshDatabase()
    {
        await CreateSeeder().SeedCatalog();

        Assert.Equal(11, _quizzes.Store.Count);
        var clf = _quizzes.Store.Single(q => q.Slug == "CLF-C02");
        Assert.Equal(2, clf.Questions.Count);
        Assert.All(clf.Questions, q => Assert.Equal(QuestionDifficulty.Hard, q.Difficulty));
        Assert.NotNull(clf.QuestionsHash);

        // One subquiz per distinct domain per quiz with a questions file.
        var clfSubquizzes = _subquizzes.Store.Where(s => s.QuizId == clf.Id).ToList();
        Assert.Equal(2, clfSubquizzes.Count);
        Assert.Contains(clfSubquizzes, s => s.Slug == "CLF-C02-domain-a");
        Assert.Equal(SeededFileSlugs.Length * 2, _subquizzes.Store.Count);
    }

    [Fact]
    public async Task SeedCatalog_IsIdempotent_SecondBootWritesNothing()
    {
        var seeder = CreateSeeder();
        await seeder.SeedCatalog();
        var quizCount = _quizzes.Store.Count;
        var subquizCount = _subquizzes.Store.Count;

        await seeder.SeedCatalog();

        // Same file hash on second boot: no re-seed, no extra rows.
        Assert.Equal(quizCount, _quizzes.Store.Count);
        Assert.Equal(subquizCount, _subquizzes.Store.Count);
        Assert.Equal(0, _quizzes.ReplaceQuestionsCalls);
    }

    [Fact]
    public async Task SeedCatalog_ReplacesQuestions_WhenQuestionsFileChanged()
    {
        var seeder = CreateSeeder();
        await seeder.SeedCatalog();

        WriteQuestionsFile("clf-c02", BuildQuestionPayloads("Domain A", "Domain C"));
        await seeder.SeedCatalog();

        Assert.Equal(1, _quizzes.ReplaceQuestionsCalls);
        var clf = _quizzes.Store.Single(q => q.Slug == "CLF-C02");
        var clfSubquizzes = _subquizzes.Store.Where(s => s.QuizId == clf.Id).ToList();

        // New domain gains a subquiz; vanished domain is disabled, not deleted.
        Assert.Contains(clfSubquizzes, s => s.Slug == "CLF-C02-domain-c" && s.IsAvailable);
        Assert.Contains(clfSubquizzes, s => s.Slug == "CLF-C02-domain-b" && !s.IsAvailable);
    }

    [Fact]
    public async Task SeedCatalog_ThrowsWithOffendingValue_OnUnknownDifficulty()
    {
        var payloads = BuildQuestionPayloads("Domain A");
        payloads[0].Difficulty = "impossible";
        WriteQuestionsFile("clf-c02", payloads);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => CreateSeeder().SeedCatalog());

        Assert.Contains("impossible", exception.Message);
    }
}

/// <summary>In-memory <see cref="IQuizRepository"/> that assigns identities like the database would.</summary>
internal class InMemoryQuizRepository : IQuizRepository
{
    public List<Quiz> Store { get; } = new();
    public int ReplaceQuestionsCalls { get; private set; }
    private int _nextId = 1;

    public Task Create(Quiz quiz)
    {
        Store.Add(CloneWithId(quiz));
        return Task.CompletedTask;
    }

    public Task CreateMany(List<Quiz> quizzes)
    {
        quizzes.ForEach(q => Store.Add(CloneWithId(q)));
        return Task.CompletedTask;
    }

    public Task<Quiz?> GetQuizBySlug(string slug) =>
        Task.FromResult(Store.FirstOrDefault(q => string.Equals(q.Slug, slug, StringComparison.OrdinalIgnoreCase)));

    public Task ReplaceQuestions(int quizId, List<Question> questions, string questionsHash)
    {
        ReplaceQuestionsCalls++;
        var quiz = Store.Single(q => q.Id == quizId);
        quiz.Questions = questions;
        quiz.QuestionsHash = questionsHash;
        return Task.CompletedTask;
    }

    public Task Update(Quiz quiz) => Task.CompletedTask;
    public Task<List<Quiz>> GetQuizzes() => Task.FromResult(Store.ToList());
    public Task<Quiz?> GetQuizById(int quizId) => throw new NotSupportedException();

    private Quiz CloneWithId(Quiz quiz) => new()
    {
        Id = _nextId++,
        Title = quiz.Title,
        Description = quiz.Description,
        IconName = quiz.IconName,
        IsAvailable = quiz.IsAvailable,
        QuizProvider = quiz.QuizProvider,
        QuizLevel = quiz.QuizLevel,
        Slug = quiz.Slug,
        MinQuestions = quiz.MinQuestions,
        MaxQuestions = quiz.MaxQuestions,
        QuestionsHash = quiz.QuestionsHash,
        Questions = quiz.Questions ?? new List<Question>()
    };
}

/// <summary>In-memory <see cref="ISubquizRepository"/> capturing what the seeder persists.</summary>
internal class InMemorySubquizRepository : ISubquizRepository
{
    public List<Subquiz> Store { get; } = new();

    public Task CreateMany(List<Subquiz> subquizzes)
    {
        Store.AddRange(subquizzes);
        return Task.CompletedTask;
    }

    public Task<List<Subquiz>> GetSubquizzesByQuizId(int quizId) =>
        Task.FromResult(Store.Where(s => s.QuizId == quizId).ToList());

    public Task UpdateMany(List<Subquiz> subquizzes) => Task.CompletedTask;
    public Task<List<Subquiz>> GetAllSubquizzes() => Task.FromResult(Store.ToList());
    public Task Create(Subquiz subquiz) => throw new NotSupportedException();
    public Task<Subquiz?> GetSubquizById(int subquizId) => throw new NotSupportedException();
}

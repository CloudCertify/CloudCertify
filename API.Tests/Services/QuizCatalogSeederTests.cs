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
    private readonly InMemoryDrillRepository _drills = new();

    public QuizCatalogSeederTests()
    {
        Directory.CreateDirectory(_questionsDir);
        foreach (var slug in SeededFileSlugs)
        {
            WriteQuestionsFile(slug, BuildQuestionPayloads("Domain A", "Domain B"));
        }
    }

    public void Dispose() => Directory.Delete(_questionsDir, recursive: true);

    private QuizCatalogSeeder CreateSeeder() => new(_quizzes, _drills);

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
    public async Task SeedCatalog_PopulatesQuizzesQuestionsAndDomainDrills_OnFreshDatabase()
    {
        await CreateSeeder().SeedCatalog();

        Assert.Equal(11, _quizzes.Store.Count);
        var clf = _quizzes.Store.Single(q => q.Slug == "CLF-C02");
        Assert.Equal(2, clf.Questions.Count);
        Assert.All(clf.Questions, q => Assert.Equal(QuestionDifficulty.Hard, q.Difficulty));
        Assert.NotNull(clf.QuestionsHash);

        // One drill per distinct domain per quiz with a questions file, plus one Mistakes drill.
        var clfDrills = _drills.Store.Where(s => s.QuizId == clf.Id).ToList();
        Assert.Equal(3, clfDrills.Count);
        Assert.Contains(clfDrills, s => s.Slug == "CLF-C02-domain-a");
        Assert.Equal(SeededFileSlugs.Length * 3, _drills.Store.Count);
    }

    [Fact]
    public async Task SeedCatalog_SeedsOneCrossDomainMistakesDrill_PerQuiz()
    {
        await CreateSeeder().SeedCatalog();

        var clf = _quizzes.Store.Single(q => q.Slug == "CLF-C02");
        var mistakes = Assert.Single(_drills.Store, s => s.QuizId == clf.Id && s.DrawRule == DrawRule.Mistakes);

        Assert.Equal("CLF-C02-mistakes", mistakes.Slug);
        Assert.Equal("Mistakes (CLF-C02)", mistakes.Title);
        Assert.Null(mistakes.Domain); // the review runs across the parent Quiz (ADR 0010)
        Assert.True(mistakes.IsAvailable);
    }

    [Fact]
    public async Task SeedCatalog_LeavesTheMistakesDrillAlone_WhenADomainVanishes()
    {
        // It is scoped to no Domain, so no change to the file can make it stale.
        var seeder = CreateSeeder();
        await seeder.SeedCatalog();

        WriteQuestionsFile("clf-c02", BuildQuestionPayloads("Domain A"));
        await seeder.SeedCatalog();

        var clf = _quizzes.Store.Single(q => q.Slug == "CLF-C02");
        var mistakes = Assert.Single(_drills.Store, s => s.QuizId == clf.Id && s.DrawRule == DrawRule.Mistakes);
        Assert.True(mistakes.IsAvailable);
    }

    [Fact]
    public async Task SeedCatalog_IsIdempotent_SecondBootWritesNothing()
    {
        var seeder = CreateSeeder();
        await seeder.SeedCatalog();
        var quizCount = _quizzes.Store.Count;
        var drillCount = _drills.Store.Count;

        await seeder.SeedCatalog();

        // Same file hash on second boot: no re-seed, no extra rows.
        Assert.Equal(quizCount, _quizzes.Store.Count);
        Assert.Equal(drillCount, _drills.Store.Count);
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
        var clfDrills = _drills.Store.Where(s => s.QuizId == clf.Id).ToList();

        // New domain gains a drill; vanished domain is disabled, not deleted.
        Assert.Contains(clfDrills, s => s.Slug == "CLF-C02-domain-c" && s.IsAvailable);
        Assert.Contains(clfDrills, s => s.Slug == "CLF-C02-domain-b" && !s.IsAvailable);
    }

    [Fact]
    public async Task SeedCatalog_MapsPtFieldsOntoEntities_AndLeavesThemNullWhenAbsent()
    {
        var payloads = BuildQuestionPayloads("Domain A", "Domain B");
        payloads[0].TextPt = "Pergunta?";
        payloads[0].ExplanationPt = "Porque sim";
        payloads[0].Answers![0].TextPt = "Sim";
        WriteQuestionsFile("clf-c02", payloads);

        await CreateSeeder().SeedCatalog();

        var questions = _quizzes.Store.Single(q => q.Slug == "CLF-C02").Questions.ToList();
        var translated = questions.Single(q => q.Domain == "Domain A");
        Assert.Equal("Pergunta?", translated.TextPt);
        Assert.Equal("Porque sim", translated.ExplanationPt);
        Assert.Equal("Sim", translated.Answers.Single().TextPt);

        // EN-only payload seeds with null PT fields (missing translation, story #14).
        var enOnly = questions.Single(q => q.Domain == "Domain B");
        Assert.Null(enOnly.TextPt);
        Assert.Null(enOnly.ExplanationPt);
        Assert.Null(enOnly.Answers.Single().TextPt);
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

/// <summary>In-memory <see cref="IDrillRepository"/> capturing what the seeder persists.</summary>
internal class InMemoryDrillRepository : IDrillRepository
{
    public List<Drill> Store { get; } = new();

    public Task CreateMany(List<Drill> drills)
    {
        Store.AddRange(drills);
        return Task.CompletedTask;
    }

    public Task<List<Drill>> GetDrillsByQuizId(int quizId) =>
        Task.FromResult(Store.Where(s => s.QuizId == quizId).ToList());

    public Task UpdateMany(List<Drill> drills) => Task.CompletedTask;
    public Task<List<Drill>> GetAllDrills() => Task.FromResult(Store.ToList());
    public Task Create(Drill drill) => throw new NotSupportedException();
    public Task<Drill?> GetDrillById(int drillId) => throw new NotSupportedException();
}

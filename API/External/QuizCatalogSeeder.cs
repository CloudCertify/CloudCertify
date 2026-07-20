using System.Security.Cryptography;
using System.Text;
using API.Repositories;

namespace API.External;

using Newtonsoft.Json;
using Entities;

/// <summary>
/// Idempotently seeds the quiz catalog at startup. Each quiz with a questions file gets
/// its question bank inserted and one subquiz generated per distinct question domain.
/// The file's SHA-256 is stamped on the quiz; when the file changes on disk the quiz's
/// questions are wiped and re-seeded on next boot. Subquizzes whose domain disappeared
/// from the file are disabled (not deleted — submissions may reference them).
/// </summary>
/// <example>await seeder.SeedCatalog();</example>
public class QuizCatalogSeeder
{
    private readonly IQuizRepository _quizRepository;
    private readonly ISubquizRepository _subquizRepository;

    public QuizCatalogSeeder(IQuizRepository quizRepository, ISubquizRepository subquizRepository)
    {
        _quizRepository = quizRepository;
        _subquizRepository = subquizRepository;
    }

    public async Task SeedCatalog()
    {
        foreach (var seed in QuizSeeds)
        {
            await SeedQuiz(seed);
        }
    }

    private async Task SeedQuiz(QuizSeed seed)
    {
        var quiz = await _quizRepository.GetQuizBySlug(seed.Slug);

        if (string.IsNullOrWhiteSpace(seed.QuestionsFileName))
        {
            if (quiz == null)
            {
                await _quizRepository.Create(seed.ToQuiz());
            }
            return;
        }

        var bank = LoadQuestionBank(seed.QuestionsFileName);
        if (bank == null)
        {
            return;
        }

        quiz = await UpsertQuizWithQuestions(seed, quiz, bank);
        await SyncSubquizzes(seed, quiz, bank.Payloads);
    }

    private async Task<Quiz> UpsertQuizWithQuestions(QuizSeed seed, Quiz? quiz, QuestionBank bank)
    {
        if (quiz == null)
        {
            quiz = seed.ToQuiz();
            quiz.QuestionsHash = bank.Hash;
            quiz.Questions = bank.Payloads.Select(ToQuestion).ToList();
            await _quizRepository.Create(quiz);
            // Re-fetch so the returned quiz carries its database-assigned Id regardless
            // of whether the repository mutates the instance it was given.
            return await _quizRepository.GetQuizBySlug(seed.Slug) ?? quiz;
        }

        if (!string.Equals(quiz.QuestionsHash, bank.Hash, StringComparison.OrdinalIgnoreCase))
        {
            var questions = bank.Payloads.Select(ToQuestion).ToList();
            await _quizRepository.ReplaceQuestions(quiz.Id, questions, bank.Hash);
        }

        await SyncQuizMetadata(seed, quiz);
        return quiz;
    }

    /// <summary>Keeps availability and served-question range of pre-existing quizzes in step with the seed.</summary>
    private async Task SyncQuizMetadata(QuizSeed seed, Quiz quiz)
    {
        var changed = quiz.IsAvailable != seed.IsAvailable
                      || quiz.MinQuestions != seed.MinQuestions
                      || quiz.MaxQuestions != seed.MaxQuestions;
        if (!changed)
        {
            return;
        }

        quiz.IsAvailable = seed.IsAvailable;
        quiz.MinQuestions = seed.MinQuestions;
        quiz.MaxQuestions = seed.MaxQuestions;
        await _quizRepository.Update(quiz);
    }

    private async Task SyncSubquizzes(QuizSeed seed, Quiz quiz, List<QuestionPayload> payloads)
    {
        var domains = payloads
            .Select(p => p.Domain)
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => d!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existing = await _subquizRepository.GetSubquizzesByQuizId(quiz.Id);
        var desiredSlugs = domains.ToDictionary(d => BuildSubquizSlug(seed.Slug, d), d => d, StringComparer.OrdinalIgnoreCase);

        var toCreate = desiredSlugs
            .Where(pair => existing.All(s => !string.Equals(s.Slug, pair.Key, StringComparison.OrdinalIgnoreCase)))
            .Select(pair => BuildSubquiz(seed, quiz.Id, pair.Key, pair.Value))
            .ToList();

        // Domain vanished from the file: hide the subquiz but keep the row —
        // Submission.SubquizId still points at it.
        var toDisable = existing
            .Where(s => s.IsAvailable && !desiredSlugs.ContainsKey(s.Slug))
            .ToList();
        toDisable.ForEach(s => s.IsAvailable = false);

        if (toCreate.Count > 0) await _subquizRepository.CreateMany(toCreate);
        if (toDisable.Count > 0) await _subquizRepository.UpdateMany(toDisable);
    }

    private static Subquiz BuildSubquiz(QuizSeed seed, int quizId, string slug, string domain)
    {
        return new Subquiz
        {
            QuizId = quizId,
            Title = $"{domain} ({seed.Slug})",
            Domain = domain,
            Slug = slug,
            IsAvailable = seed.IsAvailable,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>Turns "Security and Compliance" + "CLF-C02" into "CLF-C02-security-and-compliance".</summary>
    private static string BuildSubquizSlug(string quizSlug, string domain)
    {
        var normalized = new string(domain.ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray());
        var collapsed = string.Join('-', normalized.Split('-', StringSplitOptions.RemoveEmptyEntries));
        return $"{quizSlug}-{collapsed}";
    }

    private static QuestionBank? LoadQuestionBank(string questionsFileName)
    {
        var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "External", "questions", questionsFileName);
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"Questions file not found: {filePath}");
            return null;
        }

        var json = File.ReadAllText(filePath);
        var payloads = JsonConvert.DeserializeObject<List<QuestionPayload>>(json) ?? [];
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
        return new QuestionBank(payloads, hash);
    }

    private static Question ToQuestion(QuestionPayload question)
    {
        return new Question
        {
            Text = question.Text,
            Images = question.Images,
            Type = ParseQuestionType(question.Type),
            SelectCount = question.SelectCount,
            Domain = question.Domain,
            Concepts = question.Concepts,
            ServiceCategory = question.ServiceCategory,
            Services = question.Services,
            Explanation = question.Explanation,
            TextPt = question.TextPt,
            ExplanationPt = question.ExplanationPt,
            Difficulty = ParseDifficulty(question.Difficulty),
            Answers = (question.Answers ?? []).Select(answer => new Answer
            {
                Text = answer.Text,
                TextPt = answer.TextPt,
                IsCorrect = answer.IsCorrect,
                Image = answer.Image,
            }).ToList(),
        };
    }

    private static QuestionType ParseQuestionType(string? type)
    {
        return type switch
        {
            "multiple_choice" => QuestionType.MultipleChoice,
            "multiple_response" => QuestionType.MultipleResponse,
            _ => throw new InvalidOperationException(
                $"Unknown question type: '{type}'. Expected 'multiple_choice' or 'multiple_response'.")
        };
    }

    private static QuestionDifficulty ParseDifficulty(string? difficulty)
    {
        return difficulty?.ToLowerInvariant() switch
        {
            "easy" => QuestionDifficulty.Easy,
            "medium" or null or "" => QuestionDifficulty.Medium,
            "hard" => QuestionDifficulty.Hard,
            _ => throw new InvalidOperationException(
                $"Unknown difficulty: '{difficulty}'. Expected 'easy', 'medium' or 'hard'.")
        };
    }

    private sealed record QuestionBank(List<QuestionPayload> Payloads, string Hash);

    private static readonly List<QuizSeed> QuizSeeds =
    [
        new()
        {
            Title = "AWS Certified Cloud Practitioner (CLF-C02)",
            Description = "Build foundational AWS Cloud concepts, services, and terminology.",
            IconName = "cloud",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Foundational,
            Slug = "CLF-C02",
            QuestionsFileName = "clf-c02.json",
            MinQuestions = 65, // real CLF-C02 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified Developer Associate (DVA-C02)",
            Description = "Develop and deploy applications on AWS services and tools.",
            IconName = "code",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "DVA-C02",
            QuestionsFileName = "dva-c02.json",
            MinQuestions = 65, // real DVA-C02 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified CloudOps Engineer Associate (SOA-C03)",
            Description = "Operate, manage, and automate workloads on AWS.",
            IconName = "monitor",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "SOA-C03",
            QuestionsFileName = "soa-c03.json",
            MinQuestions = 65, // real SOA-C03 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified Solutions Architect Associate (SAA-C03)",
            Description = "Design secure, resilient, and cost-optimized AWS solutions.",
            IconName = "server",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "SAA-C03",
            QuestionsFileName = "saa-c03.json",
            MinQuestions = 65, // real SAA-C03 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified Advanced Networking Specialty (ANS-C01)",
            Description = "Design and implement scalable, secure AWS and hybrid network architectures.",
            IconName = "network",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Specialist,
            Slug = "ANS-C01",
            QuestionsFileName = "ans-c01.json",
            MinQuestions = 65, // real ANS-C01 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified Security Specialty (SCS-C03)",
            Description = "Secure AWS workloads using security services, controls, and best practices.",
            IconName = "lock",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Specialist,
            Slug = "SCS-C03",
            QuestionsFileName = "scs-c03.json",
            MinQuestions = 65, // real SCS-C03 exam is a fixed 65 questions
            MaxQuestions = 65,
            IsAvailable = true
        },
        new()
        {
            Title = "Microsoft Azure Administrator (AZ-104)",
            Description = "Implement and manage Azure compute, storage, and networking.",
            IconName = "settings",
            QuizProvider = QuizProvider.Azure,
            QuizLevel = QuizLevel.Associate,
            Slug = "AZ-104"
        },
        new()
        {
            Title = "Microsoft Azure Fundamentals (AZ-900)",
            Description = "Learn foundational Azure concepts, services, and pricing.",
            IconName = "book-open",
            QuizProvider = QuizProvider.Azure,
            QuizLevel = QuizLevel.Foundational,
            Slug = "AZ-900"
        },
        new()
        {
            Title = "Windows Server Hybrid Administrator Associate (AZ-800)",
            Description = "Manage Windows Server workloads in hybrid environments.",
            IconName = "hard-drive",
            QuizProvider = QuizProvider.Azure,
            QuizLevel = QuizLevel.Associate,
            Slug = "AZ-800"
        },
        new()
        {
            Title = "Microsoft Azure Security Engineer Associate (AZ-500)",
            Description = "Implement security controls and protect Azure workloads.",
            IconName = "shield",
            QuizProvider = QuizProvider.Azure,
            QuizLevel = QuizLevel.Associate,
            Slug = "AZ-500"
        },
        new()
        {
            Title = "Google Cloud Platform Associate Cloud Engineer (ACE)",
            Description = "Deploy, manage, and monitor GCP resources and services.",
            IconName = "cpu",
            QuizProvider = QuizProvider.GCP,
            QuizLevel = QuizLevel.Associate,
            Slug = "ACE"
        }
    ];
}

public class QuestionPayload
{
    public string? Text { get; set; }
    public string[] Images { get; set; } = [];
    public string Type { get; set; }
    public int SelectCount { get; set; }
    public string? Domain { get; set; }
    public string[]? Concepts { get; set; }
    public string? ServiceCategory { get; set; }
    public string[]? Services { get; set; }
    public string? Explanation { get; set; }
    // PT-BR fields ride inline on the combined questions file (issue #37, ADR 0004).
    public string? TextPt { get; set; }
    public string? ExplanationPt { get; set; }
    public string? Difficulty { get; set; }
    public List<AnswerPayload>? Answers { get; set; }
}

public class AnswerPayload
{
    public string? Text { get; set; }
    public string? TextPt { get; set; }
    public bool IsCorrect { get; set; }
    public string? Image { get; set; }
}

public class QuizSeed
{
    public string Title { get; init; }
    public string Description { get; init; }
    public string IconName { get; init; }

    public bool IsAvailable { get; set; } = false;
    public QuizProvider QuizProvider { get; init; }
    public QuizLevel QuizLevel { get; init; }
    public string Slug { get; init; }
    public string QuestionsFileName { get; init; }

    // Default to the ranged 40/60 the entity uses; fixed exams override both (65/65).
    public int MinQuestions { get; init; } = 40;
    public int MaxQuestions { get; init; } = 60;

    public Quiz ToQuiz()
    {
        return new Quiz
        {
            Title = Title,
            Description = Description,
            IconName = IconName,
            IsAvailable = IsAvailable,
            QuizProvider = QuizProvider,
            QuizLevel = QuizLevel,
            Slug = Slug,
            MinQuestions = MinQuestions,
            MaxQuestions = MaxQuestions
        };
    }
}

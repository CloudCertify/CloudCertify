using API.Repositories;

namespace API.External;

using Newtonsoft.Json;
using Entities;

/// <summary>
/// Idempotently seeds the quiz catalog (parent quizzes, their question banks, and
/// domain-scoped subquizzes) at startup. Existing quizzes are skipped by title, so
/// repeat boots are no-ops that never re-read the questions files.
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
        var existingQuizzes = await _quizRepository.GetQuizzes();
        var existingTitles = existingQuizzes.Select(q => q.Title).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // First pass: create parent quizzes (ParentSlug == null)
        var parentQuizzesToCreate = new List<Quiz>();
        var subquizSeeds = new List<QuizSeed>();

        foreach (var seed in QuizSeeds)
        {
            if (existingTitles.Contains(seed.Title))
            {
                continue;
            }

            if (seed.ParentSlug != null)
            {
                subquizSeeds.Add(seed);
                continue;
            }

            if (!string.IsNullOrWhiteSpace(seed.QuestionsFileName))
            {
                parentQuizzesToCreate.Add(BuildQuizWithQuestions(seed));
                continue;
            }

            parentQuizzesToCreate.Add(seed.ToQuiz());
        }

        if (parentQuizzesToCreate.Count > 0)
        {
            await _quizRepository.CreateMany(parentQuizzesToCreate);
        }

        // Second pass: create subquizzes with resolved ParentQuizId
        if (subquizSeeds.Count > 0)
        {
            var allQuizzes = await _quizRepository.GetQuizzes();
            var slugToId = allQuizzes.ToDictionary(q => q.Slug, q => q.Id, StringComparer.OrdinalIgnoreCase);

            // Subquizzes live in their own table, so their idempotency check must read
            // existing subquiz slugs — not parent-quiz titles, which never match here.
            var existingSubquizSlugs = (await _subquizRepository.GetAllSubquizzes())
                .Select(s => s.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var subquizzesToCreate = new List<Subquiz>();
            foreach (var subquizSeed in subquizSeeds)
            {
                if (existingSubquizSlugs.Contains(subquizSeed.Slug))
                {
                    continue;
                }

                if (slugToId.TryGetValue(subquizSeed.ParentSlug!, out var parentId))
                {
                    subquizzesToCreate.Add(new Subquiz
                    {
                        QuizId = parentId,
                        Title = subquizSeed.Title,
                        Domain = subquizSeed.Domain ?? "",
                        Slug = subquizSeed.Slug,
                        IsAvailable = subquizSeed.IsAvailable,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (subquizzesToCreate.Count > 0)
            {
                await _subquizRepository.CreateMany(subquizzesToCreate);
            }
        }
    }

    private static Quiz BuildQuizWithQuestions(QuizSeed seed)
    {
        var quiz = seed.ToQuiz();
        var filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "External", "questions", seed.QuestionsFileName);

        if (!File.Exists(filePath))
        {
            Console.WriteLine($"Questions file not found: {filePath}");
            return quiz;
        }

        var json = File.ReadAllText(filePath);
        var jsonQuestions = JsonConvert.DeserializeObject<List<QuestionPayload>>(json) ?? new List<QuestionPayload>();

        quiz.Questions = jsonQuestions.Select(question => new API.Entities.Question
        {
            Text = question.Text,
            Images = question.Images,
            Type = question.Type switch
            {
                "multiple_choice" => QuestionType.MultipleChoice,
                "multiple_response" => QuestionType.MultipleResponse,
                _ => throw new InvalidOperationException($"Unknown question type: {question.Type}")
            },
            SelectCount = question.SelectCount,
            Domain = question.Domain,
            Concepts = question.Concepts,
            ServiceCategory = question.ServiceCategory,
            Services = question.Services,
            Explanation = question.Explanation,
            Answers = (question.Answers ?? []).Select(answer => new API.Entities.Answer
            {
                Text = answer.Text,
                IsCorrect = answer.IsCorrect,
                Image = answer.Image,
            }).ToList(),
        }).ToList();

        return quiz;
    }

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
            Title = "Cloud Concepts (CLF-C02)",
            Description = "Practice questions focused on Cloud Concepts domain.",
            IconName = "cloud",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Foundational,
            Slug = "CLF-C02-DOMAIN-1",
            ParentSlug = "CLF-C02",
            Domain = "Cloud Concepts",
            IsAvailable = true
        },
        new()
        {
            Title = "Security and Compliance (CLF-C02)",
            Description = "Practice questions focused on Security and Compliance domain.",
            IconName = "cloud",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Foundational,
            Slug = "CLF-C02-DOMAIN-2",
            ParentSlug = "CLF-C02",
            Domain = "Security and Compliance",
            IsAvailable = true
        },
        new()
        {
            Title = "Cloud Technology and Services (CLF-C02)",
            Description = "Practice questions focused on Cloud Technology and Services domain.",
            IconName = "cloud",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Foundational,
            Slug = "CLF-C02-DOMAIN-3",
            ParentSlug = "CLF-C02",
            Domain = "Cloud Technology and Services",
            IsAvailable = true
        },
        new()
        {
            Title = "Billing, Pricing, and Support (CLF-C02)",
            Description = "Practice questions focused on Billing, Pricing, and Support domain.",
            IconName = "cloud",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Foundational,
            Slug = "CLF-C02-DOMAIN-4",
            ParentSlug = "CLF-C02",
            Domain = "Billing, Pricing, and Support",
            IsAvailable = true
        },
        new()
        {
            Title = "AWS Certified Developer Associate (DVA-C02)",
            Description = "Develop and deploy applications on AWS services and tools.",
            IconName = "code",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "DVA-C02"
        },
        new()
        {
            Title = "AWS Certified CloudOps Engineer Associate (SOA-C03)",
            Description = "Operate, manage, and automate workloads on AWS.",
            IconName = "monitor",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "SOA-C03"
        },
        new()
        {
            Title = "AWS Certified Solutions Architect Associate (SAA-C03)",
            Description = "Design secure, resilient, and cost-optimized AWS solutions.",
            IconName = "server",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Associate,
            Slug = "SAA-C03"
        },
        new()
        {
            Title = "AWS Certified Advanced Networking Specialty (ANS-C01)",
            Description = "Design and implement scalable, secure AWS and hybrid network architectures.",
            IconName = "network",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Specialist,
            Slug = "ANS-C01"
        },
        new()
        {
            Title = "AWS Certified Security Specialty (SCS-C03)",
            Description = "Secure AWS workloads using security services, controls, and best practices.",
            IconName = "lock",
            QuizProvider = QuizProvider.AWS,
            QuizLevel = QuizLevel.Specialist,
            Slug = "SCS-C03"
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
    public List<AnswerPayload>? Answers { get; set; }
}

public class AnswerPayload
{
    public string? Text { get; set; }
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
    public string? ParentSlug { get; init; }
    public string? Domain { get; init; }
    public string QuestionsFileName { get; init; }

    // Default to the ranged 40/60 the entity uses; fixed exams override both (CLF-C02 = 65/65).
    public int MinQuestions { get; init; } = 40;
    public int MaxQuestions { get; init; } = 60;

    public Quiz ToQuiz(int? parentId = null)
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
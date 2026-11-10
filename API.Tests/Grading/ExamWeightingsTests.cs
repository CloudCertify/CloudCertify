using API.External;
using API.Services.Grading;
using Newtonsoft.Json;

namespace API.Tests.Grading;

/// <summary>
/// One row per certification, checked for the three things a weights row can get wrong: weights
/// that do not sum to 100%, a pass mark that is not the published one, and a Domain name that has
/// drifted from the question bank (which would silently score zero weight).
/// </summary>
public class ExamWeightingsTests
{
    /// <summary>Published passing Scaled Scores from each exam guide: the independent source of truth.</summary>
    public static TheoryData<string, int> PublishedPassMarks => new()
    {
        { "CLF-C02", 700 }, { "AIF-C01", 700 },
        { "SAA-C03", 720 }, { "DVA-C02", 720 }, { "SOA-C03", 720 }, { "DEA-C01", 720 }, { "MLA-C01", 720 },
        { "ANS-C01", 750 }, { "SCS-C03", 750 }, { "SAP-C02", 750 }, { "DOP-C02", 750 },
    };

    [Fact]
    public void Table_CoversExactlyTheCatalogedCertifications()
    {
        var expected = PublishedPassMarks.Select(row => (string)row[0]).Order();

        Assert.Equal(expected, ExamWeightings.BySlug.Keys.Order());
    }

    [Theory]
    [MemberData(nameof(PublishedPassMarks))]
    public void Row_WeightsSumToOne_AndPassMarkIsPublished(string slug, int passMark)
    {
        var weighting = ExamWeightings.BySlug[slug];

        Assert.Equal(1.0, weighting.DomainWeights.Values.Sum(), precision: 3);
        Assert.Equal(passMark, weighting.PassingScaledScore);
        Assert.StartsWith("https://docs.aws.amazon.com/aws-certification/", weighting.SourceUrl);
    }

    /// <summary>
    /// Every Domain the question bank uses must be weighted: a name that drifted on either side
    /// leaves those Questions scoring zero weight. Checked this way round because a bank may not
    /// cover every guide Domain yet (AIF-C01 covers 2 of 5, see QuizCatalogSeeder). The banks are
    /// gitignored (API/AGENTS.md), so this runs only in a checkout that has them; elsewhere it
    /// has nothing to compare against and passes.
    /// </summary>
    [Theory]
    [MemberData(nameof(PublishedPassMarks))]
    public void Row_WeightsEveryDomainTheQuestionBankUses(string slug, int passMark)
    {
        _ = passMark;
        var bankDomains = LoadBankDomains(slug);
        if (bankDomains == null) return;

        var unweighted = bankDomains.Except(ExamWeightings.BySlug[slug].DomainWeights.Keys).ToList();

        Assert.True(unweighted.Count == 0,
            $"{slug} question bank uses Domains its weights row does not name: [{string.Join(", ", unweighted)}]");
    }

    private static HashSet<string>? LoadBankDomains(string slug)
    {
        var dir = FindQuestionsDirectory();
        var path = dir == null ? null : Path.Combine(dir, $"{slug.ToLowerInvariant()}.json");
        if (path == null || !File.Exists(path)) return null;

        var payloads = JsonConvert.DeserializeObject<List<QuestionPayload>>(File.ReadAllText(path)) ?? [];
        return payloads.Select(p => p.Domain).OfType<string>().ToHashSet();
    }

    /// <summary>Walks up from the test binaries to the repository's API/External/questions.</summary>
    private static string? FindQuestionsDirectory()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "API", "External", "questions");
            if (Directory.Exists(candidate)) return candidate;
        }

        return null;
    }
}

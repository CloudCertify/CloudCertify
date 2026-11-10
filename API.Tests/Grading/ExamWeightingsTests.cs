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
    /// Banks that do not yet cover every guide Domain, so a weighted Domain may have no Questions.
    /// Each stays unseeded until it does (see QuizCatalogSeeder); remove the row when it is filled.
    /// </summary>
    private static readonly Dictionary<string, string[]> KnownUncoveredDomains = new()
    {
        ["AIF-C01"] = ["Fundamentals of GenAI", "Applications of Foundation Models", "Guidelines for Responsible AI"],
    };

    /// <summary>
    /// A weights row and its question bank must name the same Domains, so a misspelling on either
    /// side cannot leave Questions scoring zero weight or a weight matching nothing. Only the
    /// listed <see cref="KnownUncoveredDomains"/> may be missing from a bank.
    /// The banks are gitignored (API/AGENTS.md) and cannot ship as fixtures, so this runs only in
    /// a checkout that has them; elsewhere it has nothing to compare against and passes.
    /// </summary>
    [Theory]
    [MemberData(nameof(PublishedPassMarks))]
    public void Row_NamesTheSameDomainsAsItsQuestionBank(string slug, int passMark)
    {
        _ = passMark;
        var bankDomains = LoadBankDomains(slug);
        if (bankDomains == null) return;

        var weighted = ExamWeightings.BySlug[slug].DomainWeights.Keys.ToHashSet();
        var uncovered = KnownUncoveredDomains.GetValueOrDefault(slug, []);

        Assert.True(bankDomains.IsSubsetOf(weighted),
            $"{slug} bank uses unweighted Domains: [{string.Join(", ", bankDomains.Except(weighted))}]");
        Assert.Equal(weighted.Except(uncovered).Order(), bankDomains.Order());
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

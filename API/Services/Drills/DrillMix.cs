using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// Draws a Drill's 15 Questions by Recall instead of uniformly at random: 11 seats for the lowest
/// Recall among Missed and Due, 4 for Unseen, so what the visitor missed or is forgetting comes
/// back and what they still know gets out of the way (ADR 0008, ADR 0013).
/// </summary>
/// <remarks>
/// Two properties make this testable without a seeded RNG: the draw's <em>composition</em> is
/// guaranteed even though the Unseen pick is random, and an empty <see cref="OutcomeSnapshot"/>
/// degrades to a uniform random draw through the ordinary spill path rather than a branch. Seat
/// counts, spill order and cooldown scope are tuning knobs — change them with data, they are not
/// decisions of record. One rule for Domain-scoped and whole-Quiz drills: the caller picks scope.
/// </remarks>
public static class DrillMix
{
    public const int Size = 15;
    public const int ReviewSeats = 11;
    public const int UnseenSeats = Size - ReviewSeats;

    /// <summary>
    /// Draws up to <see cref="Size"/> distinct Questions from <paramref name="scopeQuestions"/>.
    /// Returns fewer only when the scope itself holds fewer — a short side spills, it never
    /// shortens the drill.
    /// </summary>
    public static List<Question> Draw(IReadOnlyList<Question> scopeQuestions, OutcomeSnapshot snapshot)
    {
        var (review, unseen, lastResort) = BuildPools(scopeQuestions, snapshot);
        var cooldown = snapshot.Cooldown;
        var drill = new List<Question>();

        // Each side takes its own share first, so a deep review cannot eat the Unseen the visitor
        // is also owed. Then each side's shortfall spills into the other.
        var reviewMissing = ReviewSeats - Take(review, cooldown, ReviewSeats, drill);
        var unseenMissing = UnseenSeats - Take(unseen, cooldown, UnseenSeats, drill);
        reviewMissing -= Take(unseen, cooldown, reviewMissing, drill);
        unseenMissing -= Take(review, cooldown, unseenMissing, drill);

        // Answering a not-Due Mastered Question early proves nothing, so it only fills what is
        // left once both sides have run dry.
        Take(lastResort, cooldown, reviewMissing + unseenMissing, drill);

        // Seat order is evidence, not a running order: served as built, every drill would open
        // with the Questions the visitor is known to have missed.
        return Shuffle(drill);
    }

    private static (List<Question> Review, List<Question> Unseen, List<Question> LastResort) BuildPools(
        IReadOnlyList<Question> scopeQuestions, OutcomeSnapshot snapshot)
    {
        // Missed first — most recently missed, miss count breaking ties: the Question the visitor
        // just got wrong is the one worth re-serving soonest. Then Due, most forgotten first.
        var missed = scopeQuestions
            .Where(q => snapshot.OutcomeOf(q.Id) == Outcome.Missed)
            .OrderByDescending(q => snapshot.Outcomes[q.Id].LastMissedAt)
            .ThenByDescending(q => snapshot.Outcomes[q.Id].MissCount);
        var mastered = scopeQuestions
            .Where(q => snapshot.OutcomeOf(q.Id) == Outcome.Mastered)
            .OrderBy(q => snapshot.RecallOf(q.Id))
            .ToList();

        return (
            missed.Concat(mastered.Where(q => snapshot.IsDue(q.Id))).ToList(),
            Shuffle(scopeQuestions.Where(q => snapshot.OutcomeOf(q.Id) == Outcome.Unseen).ToList()),
            mastered.Where(q => !snapshot.IsDue(q.Id)).ToList());
    }

    /// <summary>
    /// Moves up to <paramref name="count"/> Questions out of <paramref name="pool"/> into
    /// <paramref name="drill"/>, preferring ones outside the cooldown and falling back to
    /// cooled-down ones rather than returning short. Returns how many it took.
    /// </summary>
    private static int Take(List<Question> pool, IReadOnlySet<int> cooldown, int count, List<Question> drill)
    {
        if (count <= 0 || pool.Count == 0) return 0;

        var picked = pool.Where(q => !cooldown.Contains(q.Id))
            .Concat(pool.Where(q => cooldown.Contains(q.Id)))
            .Take(count)
            .ToList();

        drill.AddRange(picked);
        pool.RemoveAll(picked.Contains);
        return picked.Count;
    }

    private static List<Question> Shuffle(List<Question> questions) =>
        questions.OrderBy(_ => Guid.NewGuid()).ToList();
}

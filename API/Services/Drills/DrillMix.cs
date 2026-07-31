using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// Draws a Subquiz's 15 Questions from a Domain to a fixed mix of Outcomes — 9 Missed, 4 Unseen,
/// 2 Mastered — instead of uniformly at random, so the Questions a visitor missed come back and
/// the ones they know get out of the way (ADR 0008).
/// </summary>
/// <remarks>
/// Two properties make this testable without a seeded RNG: the draw's <em>composition</em> is
/// guaranteed even though the Questions within each bucket are random, and an empty
/// <see cref="OutcomeSnapshot"/> degrades to a uniform random draw through the ordinary spill
/// path rather than a branch. Bucket sizes, spill order and cooldown scope are tuning knobs —
/// change them with data, they are not decisions of record.
/// </remarks>
public static class DrillMix
{
    public const int Size = 15;

    /// <summary>The mix, in fill order. Sums to <see cref="Size"/>.</summary>
    private static readonly (Outcome Bucket, int Target)[] Mix =
    [
        (Outcome.Missed, 9),
        (Outcome.Unseen, 4),
        (Outcome.Mastered, 2),
    ];

    /// <summary>Where a bucket looks when its own pool runs dry, in order of preference.</summary>
    private static readonly Dictionary<Outcome, Outcome[]> Spill = new()
    {
        [Outcome.Missed] = [Outcome.Unseen, Outcome.Mastered],
        [Outcome.Unseen] = [Outcome.Missed, Outcome.Mastered],
        [Outcome.Mastered] = [Outcome.Unseen, Outcome.Missed],
    };

    /// <summary>
    /// Draws up to <see cref="Size"/> distinct Questions from <paramref name="domainQuestions"/>.
    /// Returns fewer only when the Domain bank itself holds fewer — a short bucket spills, it
    /// never shortens the drill.
    /// </summary>
    public static List<Question> Draw(IReadOnlyList<Question> domainQuestions, OutcomeSnapshot snapshot)
    {
        var pools = BuildPools(domainQuestions, snapshot);
        var cooldown = snapshot.Cooldown;
        var drill = new List<Question>();

        // Pass 1: every bucket takes its own share first, so a big Missed pool cannot eat the
        // Unseen the visitor is also owed.
        var deficits = new List<(Outcome Bucket, int Missing)>();
        foreach (var (bucket, target) in Mix)
        {
            var taken = Take(pools[bucket], cooldown, target, drill);
            if (taken < target)
            {
                deficits.Add((bucket, target - taken));
            }
        }

        // Pass 2: what a bucket could not fill spills, in that bucket's own order of preference.
        foreach (var (bucket, missing) in deficits)
        {
            var remaining = missing;
            foreach (var fallback in Spill[bucket])
            {
                remaining -= Take(pools[fallback], cooldown, remaining, drill);
                if (remaining == 0) break;
            }
        }

        // The buckets are an implementation detail, not a running order: served as built, every
        // drill would open with nine Questions the visitor is known to have missed.
        return Shuffle(drill);
    }

    private static Dictionary<Outcome, List<Question>> BuildPools(
        IReadOnlyList<Question> domainQuestions, OutcomeSnapshot snapshot)
    {
        var byOutcome = domainQuestions
            .GroupBy(q => snapshot.OutcomeOf(q.Id))
            .ToDictionary(g => g.Key, g => g.ToList());

        List<Question> Pool(Outcome outcome) =>
            byOutcome.TryGetValue(outcome, out var questions) ? questions : [];

        return new Dictionary<Outcome, List<Question>>
        {
            // Most-recently-missed first, miss count breaking ties: the Question the visitor just
            // got wrong is the one worth re-serving soonest.
            [Outcome.Missed] = Pool(Outcome.Missed)
                .OrderByDescending(q => snapshot.Outcomes[q.Id].LastMissedAt)
                .ThenByDescending(q => snapshot.Outcomes[q.Id].MissCount)
                .ToList(),
            [Outcome.Unseen] = Shuffle(Pool(Outcome.Unseen)),
            [Outcome.Mastered] = Shuffle(Pool(Outcome.Mastered)),
        };
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

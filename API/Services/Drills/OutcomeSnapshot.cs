using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// What one Question is worth as drill evidence: the latest <see cref="Outcome"/>, when it was
/// last missed and how often (ADR 0008), plus where it sits on the Recall ladder (ADR 0013).
/// </summary>
/// <param name="HalfLifeDays">The current rung: 1, 3, 7, 14 or 30. Back to 1 on a miss.</param>
/// <param name="LastProvedAt">When the clock last restarted. Meaningful only while Mastered.</param>
public sealed record QuestionOutcome(
    Outcome Outcome, DateTime LastMissedAt, int MissCount, int HalfLifeDays, DateTime LastProvedAt)
{
    /// <summary>
    /// How likely the Question is still known at <paramref name="now"/>:
    /// <c>2^(-days since last proof / half-life)</c>; 0 when Missed.
    /// </summary>
    /// <example>var recall = outcome.RecallAt(DateTime.UtcNow); // 0.5 one half-life after a proof</example>
    public double RecallAt(DateTime now)
    {
        if (Outcome != Outcome.Mastered) return 0;
        var days = Math.Max(0, (now - LastProvedAt).TotalDays);
        return Math.Pow(2, -days / HalfLifeDays);
    }

    /// <summary>Mastered and owed a review: Recall has fallen to 0.5 or below. Not an Outcome.</summary>
    /// <example>if (outcome.IsDueAt(submission.CreatedAt)) { /* a right answer here proves */ }</example>
    public bool IsDueAt(DateTime now) => Outcome == Outcome.Mastered && RecallAt(now) <= DueThreshold;

    public const double DueThreshold = 0.5;
}

/// <summary>
/// One User's Outcomes and Recall for one Drill's scope as of <see cref="Now"/>, plus the soft
/// cooldown set, read off their finished Submissions. This is the whole input to
/// <see cref="DrillMix"/> — everything the draw knows about a visitor's history lives here.
/// </summary>
/// <remarks>
/// <see cref="Empty"/> is what an anonymous visitor gets: no Outcomes, no cooldown, so every
/// Question is Unseen and the draw collapses to today's uniform random one with no special
/// case in the selection code (ADR 0008).
/// </remarks>
public sealed class OutcomeSnapshot
{
    /// <summary>Half-life ladder in days, one rung per consecutive proof (ADR 0013).</summary>
    public static readonly int[] Ladder = [1, 3, 7, 14, 30];

    public static readonly OutcomeSnapshot Empty =
        new(new Dictionary<int, QuestionOutcome>(), new HashSet<int>(), DateTime.MinValue);

    private OutcomeSnapshot(IReadOnlyDictionary<int, QuestionOutcome> outcomes, IReadOnlySet<int> cooldown, DateTime now)
    {
        Outcomes = outcomes;
        Cooldown = cooldown;
        Now = now;
    }

    /// <summary>Latest evidence per Question. A Question absent from here is <see cref="Outcome.Unseen"/>.</summary>
    public IReadOnlyDictionary<int, QuestionOutcome> Outcomes { get; }

    /// <summary>
    /// Questions served in the User's last finished attempt touching this scope. A preference, not a
    /// rule: <see cref="DrillMix"/> drops it rather than let a bucket come up short.
    /// </summary>
    public IReadOnlySet<int> Cooldown { get; }

    /// <summary>The instant Recall is read at.</summary>
    public DateTime Now { get; }

    public Outcome OutcomeOf(int questionId) =>
        Outcomes.TryGetValue(questionId, out var outcome) ? outcome.Outcome : Outcome.Unseen;

    /// <summary>Recall at <see cref="Now"/>, or null for an Unseen Question: never seen is not forgotten.</summary>
    /// <example>var recall = snapshot.RecallOf(question.Id) ?? 1; // treat Unseen as not owed</example>
    public double? RecallOf(int questionId) =>
        Outcomes.TryGetValue(questionId, out var outcome) ? outcome.RecallAt(Now) : null;

    /// <summary>Whether the Question is Due at <see cref="Now"/>; false for Unseen and Missed.</summary>
    /// <example>var due = drill.Count(q => snapshot.IsDue(q.Id));</example>
    public bool IsDue(int questionId) =>
        Outcomes.TryGetValue(questionId, out var outcome) && outcome.IsDueAt(Now);

    /// <summary>
    /// Folds a User's Submissions into per-Question Outcomes and Recall as of <paramref name="now"/>,
    /// scoped to <paramref name="scopeQuestionIds"/> — one Domain's Questions for a Domain-scoped
    /// Drill, the whole parent Quiz's for a null-Domain one (ADR 0010). Only
    /// <see cref="Submission.Finished"/> attempts count — an abandoned one contributes nothing.
    /// Attempts are replayed oldest-first, and Exam attempts feed in exactly like Practice ones:
    /// evidence flows in from every Mode, adaptivity flows out only to Practice draws (ADR 0008).
    /// </summary>
    /// <remarks>
    /// A Mistakes attempt is asymmetric: a right Check is skipped so recognition cannot write
    /// Mastered or prove anything, while a wrong Check or a served skip still writes Missed
    /// (ADR 0011 decision 3, issue #84). The skip is per Question, never the whole Submission.
    /// </remarks>
    /// <example>var snapshot = OutcomeSnapshot.Build(submissions, scopeIds, DateTime.UtcNow);</example>
    public static OutcomeSnapshot Build(IEnumerable<Submission> submissions, IReadOnlySet<int> scopeQuestionIds, DateTime now)
    {
        var finished = submissions
            .Where(s => s.Finished)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToList();

        var outcomes = new Dictionary<int, QuestionOutcome>();

        foreach (var submission in finished)
            ApplyAttempt(outcomes, submission, scopeQuestionIds);

        // The cooldown reads the last finished attempt that touched this scope — an Exam
        // counts, but only the slice of it that belongs here.
        var cooldown = finished
            .Select(s => s.ServedQuestionIds.Where(scopeQuestionIds.Contains).ToHashSet())
            .LastOrDefault(served => served.Count > 0) ?? new HashSet<int>();

        return new OutcomeSnapshot(outcomes, cooldown, now);
    }

    private static void ApplyAttempt(
        Dictionary<int, QuestionOutcome> outcomes, Submission submission, IReadOnlySet<int> scopeQuestionIds)
    {
        var answers = submission.RecordedAnswers.ToDictionary(r => r.QuestionId, r => r.IsCorrect);
        foreach (var questionId in submission.ServedQuestionIds.Where(scopeQuestionIds.Contains))
            ApplyQuestion(outcomes, submission, questionId, answers.GetValueOrDefault(questionId));
    }

    private static void ApplyQuestion(
        Dictionary<int, QuestionOutcome> outcomes, Submission submission, int questionId, bool? isCorrect)
    {
        // Review can add misses. It cannot prove anything: a right Check leaves the
        // prior Outcome, recency, miss count and Recall exactly as they were (issue #84).
        if (submission.DrawRule == DrawRule.Mistakes && isCorrect == true)
            return;

        // A served Question with no Recorded Answer counts as Missed, mirroring grading
        // (ADR 0001). A null IsCorrect — an answer recorded before correctness was
        // stamped — is not evidence of knowing it either.
        outcomes.TryGetValue(questionId, out var previous);
        outcomes[questionId] = isCorrect == true
            ? Proved(previous, submission.CreatedAt)
            : Missed(previous, submission.CreatedAt);
    }

    /// <summary>A miss: Missed, recency and count bumped, half-life back to the first rung.</summary>
    private static QuestionOutcome Missed(QuestionOutcome? previous, DateTime at) =>
        new(Outcome.Missed, at, (previous?.MissCount ?? 0) + 1, Ladder[0], previous?.LastProvedAt ?? at);

    /// <summary>A right answer, which proves only after Unseen, after Missed, or while Due.</summary>
    private static QuestionOutcome Proved(QuestionOutcome? previous, DateTime at)
    {
        // A first right answer after Unseen or Missed proves from the first rung.
        if (previous is not { Outcome: Outcome.Mastered })
            return new(Outcome.Mastered, previous?.LastMissedAt ?? DateTime.MinValue, previous?.MissCount ?? 0, Ladder[0], at);

        // Right before it is Due proves nothing new: no rung, no clock restart (ADR 0013).
        return previous.IsDueAt(at)
            ? previous with { HalfLifeDays = NextRung(previous.HalfLifeDays), LastProvedAt = at }
            : previous;
    }

    private static int NextRung(int halfLifeDays)
    {
        var rung = Array.IndexOf(Ladder, halfLifeDays);
        return Ladder[Math.Min(rung + 1, Ladder.Length - 1)];
    }
}

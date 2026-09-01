using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// What one Question is worth as drill evidence: the latest <see cref="Outcome"/>, when it was
/// last missed, and how often. The timestamp orders the Missed bucket (most-recently-missed
/// first) and the count breaks its ties (ADR 0008).
/// </summary>
public sealed record QuestionOutcome(Outcome Outcome, DateTime LastMissedAt, int MissCount);

/// <summary>
/// One User's Outcomes for one Drill's scope, plus the soft cooldown set, read off their finished
/// Submissions. This is the whole input to <see cref="DrillMix"/> — everything the draw knows
/// about a visitor's history lives here.
/// </summary>
/// <remarks>
/// <see cref="Empty"/> is what an anonymous visitor gets: no Outcomes, no cooldown, so every
/// Question is Unseen and the draw collapses to today's uniform random one with no special
/// case in the selection code (ADR 0008).
/// </remarks>
public sealed class OutcomeSnapshot
{
    public static readonly OutcomeSnapshot Empty = new(new Dictionary<int, QuestionOutcome>(), new HashSet<int>());

    private OutcomeSnapshot(IReadOnlyDictionary<int, QuestionOutcome> outcomes, IReadOnlySet<int> cooldown)
    {
        Outcomes = outcomes;
        Cooldown = cooldown;
    }

    /// <summary>Latest evidence per Question. A Question absent from here is <see cref="Outcome.Unseen"/>.</summary>
    public IReadOnlyDictionary<int, QuestionOutcome> Outcomes { get; }

    /// <summary>
    /// Questions served in the User's last finished attempt touching this scope. A preference, not a
    /// rule: <see cref="DrillMix"/> drops it rather than let a bucket come up short.
    /// </summary>
    public IReadOnlySet<int> Cooldown { get; }

    public Outcome OutcomeOf(int questionId) =>
        Outcomes.TryGetValue(questionId, out var outcome) ? outcome.Outcome : Outcome.Unseen;

    /// <summary>
    /// Folds a User's Submissions into per-Question Outcomes, scoped to <paramref name="scopeQuestionIds"/>
    /// — one Domain's Questions for a Domain-scoped Drill, the whole parent Quiz's for a
    /// null-Domain one (ADR 0010). Only <see cref="Submission.Finished"/> attempts count — an
    /// abandoned one contributes nothing. Attempts are replayed oldest-first so the most recent
    /// one simply overwrites, and Exam attempts feed in exactly like Practice ones: evidence
    /// flows in from every Mode, adaptivity flows out only to Practice draws (ADR 0008).
    /// </summary>
    public static OutcomeSnapshot Build(IEnumerable<Submission> submissions, IReadOnlySet<int> scopeQuestionIds)
    {
        var finished = submissions
            .Where(s => s.Finished)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToList();

        var outcomes = new Dictionary<int, QuestionOutcome>();

        foreach (var submission in finished)
        {
            var correctness = submission.RecordedAnswers.ToDictionary(r => r.QuestionId, r => r.IsCorrect == true);

            foreach (var questionId in submission.ServedQuestionIds.Where(scopeQuestionIds.Contains))
            {
                // A served Question with no Recorded Answer counts as Missed, mirroring grading
                // (ADR 0001). A null IsCorrect — an answer recorded before correctness was
                // stamped — is not evidence of knowing it either.
                var mastered = correctness.GetValueOrDefault(questionId);
                outcomes.TryGetValue(questionId, out var previous);

                outcomes[questionId] = new QuestionOutcome(
                    mastered ? Outcome.Mastered : Outcome.Missed,
                    mastered ? previous?.LastMissedAt ?? DateTime.MinValue : submission.CreatedAt,
                    (previous?.MissCount ?? 0) + (mastered ? 0 : 1));
            }
        }

        // The cooldown reads the last finished attempt that touched this scope — an Exam
        // counts, but only the slice of it that belongs here.
        var cooldown = finished
            .Select(s => s.ServedQuestionIds.Where(scopeQuestionIds.Contains).ToHashSet())
            .LastOrDefault(served => served.Count > 0) ?? new HashSet<int>();

        return new OutcomeSnapshot(outcomes, cooldown);
    }
}

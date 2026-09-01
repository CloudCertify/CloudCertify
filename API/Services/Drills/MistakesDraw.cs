using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// The review draw: the Questions the visitor's latest Outcome calls Missed, together with the
/// ones they last rated Guess or Unsure, across the whole parent Quiz (ADR 0011).
/// </summary>
/// <remarks>
/// Unlike <see cref="DrillMix"/> this draw has no buckets to spill between and no length to
/// honour. It seats what the union holds, up to <see cref="Cap"/>, and returns an empty list when
/// the union is empty — the caller turns that into "not startable", because padding a review with
/// Questions the visitor never got wrong is the one thing it must not do.
/// </remarks>
public static class MistakesDraw
{
    /// <summary>Ceiling, not a length: a union of three is a three-Question drill.</summary>
    public const int Cap = 15;

    public static List<Question> Draw(IReadOnlyList<Question> quizQuestions, MistakesSnapshot snapshot)
    {
        var outcomes = snapshot.Outcomes;

        // Missed seats first, most recently missed before the rest, miss count breaking ties.
        // Low ratings take what is left, most recently rated first. One order across the union
        // was rejected: misses accrue faster than ratings, so guesses would never surface.
        var missed = quizQuestions
            .Where(q => outcomes.OutcomeOf(q.Id) == Outcome.Missed)
            .OrderByDescending(q => outcomes.Outcomes[q.Id].LastMissedAt)
            .ThenByDescending(q => outcomes.Outcomes[q.Id].MissCount);

        var lowConfidence = quizQuestions
            .Where(q => outcomes.OutcomeOf(q.Id) != Outcome.Missed && snapshot.LowConfidence.ContainsKey(q.Id))
            .OrderByDescending(q => snapshot.LowConfidence[q.Id]);

        var seated = Cooled(missed, snapshot.Cooldown)
            .Concat(Cooled(lowConfidence, snapshot.Cooldown))
            .Take(Cap)
            .ToList();

        // Seating order is evidence, not a running order: served as built, the drill would open
        // with whatever the visitor just got wrong.
        return seated.OrderBy(_ => Guid.NewGuid()).ToList();
    }

    /// <summary>
    /// Moves the cooled-down Questions behind the rest of their own half, keeping the half's
    /// order within each. Applied per half so the cooldown can never let a low rating outrank a
    /// miss, and applied as a re-order rather than a filter so it costs the drill no seats.
    /// </summary>
    private static IEnumerable<Question> Cooled(IEnumerable<Question> half, IReadOnlySet<int> cooldown)
    {
        var ordered = half.ToList();
        return ordered.Where(q => !cooldown.Contains(q.Id)).Concat(ordered.Where(q => cooldown.Contains(q.Id)));
    }
}

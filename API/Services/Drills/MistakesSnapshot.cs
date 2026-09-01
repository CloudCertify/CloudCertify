using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// One User's evidence for the Mistakes draw over one parent Quiz: their Outcomes, their Low
/// Confidence ratings, and the soft cooldown. The two halves are read from the same finished
/// Submissions but answer different questions — correctness for the first, the visitor's own
/// rating for the second (ADR 0011).
/// </summary>
/// <remarks>
/// There is no <c>Empty</c> counterpart to <see cref="OutcomeSnapshot.Empty"/> on purpose: an
/// anonymous visitor cannot start this drill at all, so there is no degenerate case to model.
/// </remarks>
public sealed class MistakesSnapshot
{
    private MistakesSnapshot(
        OutcomeSnapshot outcomes, IReadOnlyDictionary<int, DateTime> lowConfidence, IReadOnlySet<int> cooldown)
    {
        Outcomes = outcomes;
        LowConfidence = lowConfidence;
        Cooldown = cooldown;
    }

    /// <summary>Correctness evidence, folded exactly as <see cref="DrillMix"/> reads it.</summary>
    public OutcomeSnapshot Outcomes { get; }

    /// <summary>
    /// Questions whose latest non-null Confidence on a finished full Quiz is Guess or Unsure,
    /// against when that rating was given — recency is what orders them into the leftover seats.
    /// </summary>
    public IReadOnlyDictionary<int, DateTime> LowConfidence { get; }

    /// <summary>
    /// Questions served by the User's last finished Mistakes attempt. A preference only:
    /// <see cref="MistakesDraw"/> drops it rather than seat fewer members (ADR 0011).
    /// </summary>
    public IReadOnlySet<int> Cooldown { get; }

    /// <summary>
    /// Folds a User's finished Submissions on one Quiz into review evidence.
    /// <paramref name="mistakesDrillId"/> is the Mistakes Drill itself: the cooldown is scoped to
    /// that drill's own attempts, so a Drill Mix or Exam sitting does not push a miss out of
    /// review.
    /// </summary>
    public static MistakesSnapshot Build(
        IEnumerable<Submission> submissions, IReadOnlySet<int> scopeQuestionIds, int mistakesDrillId)
    {
        var finished = submissions
            .Where(s => s.Finished)
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToList();

        var cooldown = finished
            .Where(s => s.DrillId == mistakesDrillId)
            .Select(s => s.ServedQuestionIds.Where(scopeQuestionIds.Contains).ToHashSet())
            .LastOrDefault() ?? new HashSet<int>();

        return new MistakesSnapshot(
            OutcomeSnapshot.Build(finished, scopeQuestionIds),
            BuildLowConfidence(finished, scopeQuestionIds),
            cooldown);
    }

    /// <summary>
    /// Latest rating wins, replayed oldest-first. Only a full Quiz collects Confidence, so only
    /// an Exam contributes. An unrated answer is skipped rather than written, which is what makes
    /// silence neither join nor evict; a later Confident does evict (ADR 0011).
    /// </summary>
    private static Dictionary<int, DateTime> BuildLowConfidence(
        IReadOnlyList<Submission> finished, IReadOnlySet<int> scopeQuestionIds)
    {
        var latest = new Dictionary<int, (Confidence Rating, DateTime At)>();

        foreach (var submission in finished.Where(s => s.Mode == Mode.Exam))
        {
            foreach (var answer in submission.RecordedAnswers)
            {
                if (answer.Confidence is not { } rating || !scopeQuestionIds.Contains(answer.QuestionId))
                {
                    continue;
                }

                latest[answer.QuestionId] = (rating, submission.CreatedAt);
            }
        }

        // Correctness is deliberately not consulted: a lucky guess is the case this exists for.
        return latest
            .Where(pair => pair.Value.Rating is Confidence.Guess or Confidence.Unsure)
            .ToDictionary(pair => pair.Key, pair => pair.Value.At);
    }
}

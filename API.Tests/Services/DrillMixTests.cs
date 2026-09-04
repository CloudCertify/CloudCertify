using API.Entities;
using API.Services.Drills;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

/// <summary>
/// The draw is random within each bucket, so these assert its <em>composition</em> — how many
/// Missed/Unseen/Mastered came back — never which Questions. That is the whole point of choosing
/// buckets over weighted sampling (ADR 0008): the mix is guaranteed, so it can be asserted
/// without a seeded RNG.
/// </summary>
public class DrillMixTests
{
    private const string Domain = "Security and Compliance";

    private static List<Question> Bank(int count, int firstId = 1) =>
        Enumerable.Range(firstId, count)
            .Select(i => Question(i, Domain, correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToList();

    /// <summary>A finished attempt that served <paramref name="served"/> and got <paramref name="correct"/> right.</summary>
    private static Submission Finished(int id, DateTime at, int[] served, int[] correct, int? unanswered = null) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = true, CreatedAt = at,
            ServedQuestionIds = served.ToList(),
            RecordedAnswers = served
                .Where(q => q != unanswered)
                .Select(q => new RecordedAnswer { QuestionId = q, IsCorrect = correct.Contains(q) })
                .ToList()
        };

    private static OutcomeSnapshot SnapshotOf(List<Question> bank, params Submission[] submissions) =>
        OutcomeSnapshot.Build(submissions, bank.Select(q => q.Id).ToHashSet());

    private static Dictionary<Outcome, int> Composition(List<Question> drill, OutcomeSnapshot snapshot) =>
        drill.GroupBy(q => snapshot.OutcomeOf(q.Id)).ToDictionary(g => g.Key, g => g.Count());

    private static int CountOf(List<Question> drill, OutcomeSnapshot snapshot, Outcome outcome) =>
        Composition(drill, snapshot).GetValueOrDefault(outcome);

    [Fact]
    public void Draw_FillsNineMissedFourUnseenTwoMastered_WhenEveryBucketIsDeep()
    {
        var bank = Bank(60);
        // 20 missed, 20 mastered, 20 untouched.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 40).ToArray(), correct: Enumerable.Range(21, 20).ToArray()));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(9, CountOf(drill, snapshot, Outcome.Missed));
        Assert.Equal(4, CountOf(drill, snapshot, Outcome.Unseen));
        Assert.Equal(2, CountOf(drill, snapshot, Outcome.Mastered));
    }

    [Fact]
    public void Draw_ReturnsFifteenUnseen_WhenUserHasNoHistory()
    {
        // Degrades to today's uniform random draw with no special case in the selection.
        var bank = Bank(60);

        var drill = DrillMix.Draw(bank, OutcomeSnapshot.Empty);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(DrillMix.Size, CountOf(drill, OutcomeSnapshot.Empty, Outcome.Unseen));
        Assert.Equal(DrillMix.Size, drill.Select(q => q.Id).Distinct().Count());
    }

    [Fact]
    public void Draw_SpillsShortMissedIntoUnseenBeforeMastered()
    {
        var bank = Bank(60);
        // Only 3 missed available; 9 - 3 = 6 must spill, and Unseen is first in line.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 23).ToArray(), correct: Enumerable.Range(4, 20).ToArray()));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(3, CountOf(drill, snapshot, Outcome.Missed));
        Assert.Equal(10, CountOf(drill, snapshot, Outcome.Unseen)); // 4 own + 6 spilled
        Assert.Equal(2, CountOf(drill, snapshot, Outcome.Mastered));
    }

    [Fact]
    public void Draw_SpillsShortUnseenIntoMissed_LeavingMasteredIntact()
    {
        var bank = Bank(30);
        // Whole bank seen: 28 missed, 2 mastered, 0 unseen. Unseen's 4 spill into Missed first.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 30).ToArray(), correct: [29, 30]));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(13, CountOf(drill, snapshot, Outcome.Missed)); // 9 own + 4 spilled from Unseen
        Assert.Equal(2, CountOf(drill, snapshot, Outcome.Mastered));
    }

    [Fact]
    public void Draw_GivesLightReviewPass_WhenDomainIsFullyMastered()
    {
        var bank = Bank(24);
        // 20 mastered, 4 unseen, nothing missed: Missed's 9 exhaust Unseen and land on Mastered.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 20).ToArray(), correct: Enumerable.Range(1, 20).ToArray()));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(0, CountOf(drill, snapshot, Outcome.Missed));
        Assert.Equal(4, CountOf(drill, snapshot, Outcome.Unseen));
        Assert.Equal(11, CountOf(drill, snapshot, Outcome.Mastered));
    }

    [Fact]
    public void Draw_IsAlwaysFifteenDistinctQuestions_WhenBankIsThinEnoughToForceRepeatsAcrossAttempts()
    {
        // A 16-question bank cannot honour the cooldown: 15 of the 16 were served last time.
        var bank = Bank(16);
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 15).ToArray(), correct: Enumerable.Range(1, 15).ToArray()));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(DrillMix.Size, drill.Select(q => q.Id).Distinct().Count());
    }

    [Fact]
    public void Draw_SkipsTheLastAttemptsQuestions_WhenTheBankCanAffordIt()
    {
        var bank = Bank(60);
        // 1-20 missed in January, 21-35 missed in June. The June attempt is the cooldown; its
        // Questions are the most-recently-missed, so the cooldown outranks the recency ordering.
        var lastAttempt = Enumerable.Range(21, 15).ToArray();
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 20).ToArray(), correct: []),
            Finished(2, new DateTime(2026, 6, 1), served: lastAttempt, correct: []));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(9, drill.Count(q => snapshot.OutcomeOf(q.Id) == Outcome.Missed));
        Assert.DoesNotContain(drill, q => lastAttempt.Contains(q.Id));
    }

    [Fact]
    public void Draw_DropsTheCooldown_RatherThanLeaveABucketShort()
    {
        var bank = Bank(30);
        // Every missed Question is also cooled down; the Missed bucket cannot be filled otherwise.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 15).ToArray(), correct: []));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(9, CountOf(drill, snapshot, Outcome.Missed));
    }

    [Fact]
    public void Draw_PrefersTheMostRecentlyMissed()
    {
        var bank = Bank(40);
        // 1-10 missed long ago, 11-20 missed later, then a clean attempt on 21-30 so the cooldown
        // sits on neither group and recency alone decides. Only 9 fit; the later misses win.
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 10).ToArray(), correct: []),
            Finished(2, new DateTime(2026, 6, 1), served: Enumerable.Range(11, 10).ToArray(), correct: []),
            Finished(3, new DateTime(2026, 7, 1), served: Enumerable.Range(21, 10).ToArray(),
                correct: Enumerable.Range(21, 10).ToArray()));

        var drill = DrillMix.Draw(bank, snapshot);
        var missed = drill.Where(q => snapshot.OutcomeOf(q.Id) == Outcome.Missed).Select(q => q.Id).ToList();

        Assert.Equal(9, missed.Count);
        Assert.All(missed, id => Assert.InRange(id, 11, 20));
    }
}

/// <summary>Reading Outcomes off a User's Submissions — the evidence half of ADR 0008.</summary>
public class OutcomeSnapshotTests
{
    private static readonly HashSet<int> DomainQuestions = Enumerable.Range(1, 10).ToHashSet();

    private static Submission Attempt(int id, DateTime at, bool finished, int[] served,
        int[] correct, int[]? wrong = null, DrawRule? drawRule = null) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = finished, CreatedAt = at,
            DrawRule = drawRule,
            ServedQuestionIds = served.ToList(),
            RecordedAnswers = correct.Select(q => new RecordedAnswer { QuestionId = q, IsCorrect = true })
                .Concat((wrong ?? []).Select(q => new RecordedAnswer { QuestionId = q, IsCorrect = false }))
                .ToList()
        };

    [Fact]
    public void Build_IgnoresUnfinishedSubmissions()
    {
        var snapshot = OutcomeSnapshot.Build(
            [Attempt(1, new DateTime(2026, 1, 1), finished: false, served: [1, 2], correct: [1], wrong: [2])],
            DomainQuestions);

        Assert.Equal(Outcome.Unseen, snapshot.OutcomeOf(1));
        Assert.Equal(Outcome.Unseen, snapshot.OutcomeOf(2));
        Assert.Empty(snapshot.Cooldown);
    }

    [Fact]
    public void Build_CountsAServedQuestionWithNoRecordedAnswerAsMissed()
    {
        // Mirrors grading: a served Question left unanswered is wrong (ADR 0001).
        var snapshot = OutcomeSnapshot.Build(
            [Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1, 2], correct: [1])],
            DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(2));
    }

    [Fact]
    public void Build_LetsTheMostRecentAttemptWin()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [], wrong: [1]),
            Attempt(2, new DateTime(2026, 6, 1), finished: true, served: [1], correct: [1]),
        ], DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_ReadsEvidenceFromFullQuizAttempts()
    {
        // A full Quiz Submission (no DrillId) still feeds the matching Domain's drill.
        var fullQuiz = Attempt(1, new DateTime(2026, 1, 1), finished: true,
            served: [1, 2, 3, 99], correct: [1], wrong: [2, 3]);

        var snapshot = OutcomeSnapshot.Build([fullQuiz], DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(2));
        Assert.Equal(Outcome.Unseen, snapshot.OutcomeOf(99)); // out of this Domain, out of scope
    }

    [Fact]
    public void Build_AccumulatesMissCountAcrossAttempts()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [], wrong: [1]),
            Attempt(2, new DateTime(2026, 2, 1), finished: true, served: [1], correct: [], wrong: [1]),
        ], DomainQuestions);

        Assert.Equal(2, snapshot.Outcomes[1].MissCount);
        Assert.Equal(new DateTime(2026, 2, 1), snapshot.Outcomes[1].LastMissedAt);
    }

    [Fact]
    public void Build_IgnoresConfidence()
    {
        // A Confident wrong answer and a Guessed right one are Missed and Mastered respectively:
        // correctness alone decides an Outcome (ADR 0008).
        var attempt = Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1, 2], correct: [1], wrong: [2]);
        attempt.RecordedAnswers[0].Confidence = Confidence.Guess;
        attempt.RecordedAnswers[1].Confidence = Confidence.Confident;

        var snapshot = OutcomeSnapshot.Build([attempt], DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(2));
    }

    [Fact]
    public void Build_CooldownIsTheLastFinishedAttemptTouchingTheDomain()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1, 2], correct: [1, 2]),
            Attempt(2, new DateTime(2026, 6, 1), finished: true, served: [3, 4], correct: [3, 4]),
            Attempt(3, new DateTime(2026, 7, 1), finished: true, served: [99], correct: [99]), // other Domain
        ], DomainQuestions);

        Assert.Equal([3, 4], snapshot.Cooldown.Order());
    }

    [Fact]
    public void Build_WalksTheWholeParentQuiz_WhenTheScopeIsNotOneDomain()
    {
        // A null-Domain Drill hands Build the whole Quiz's question set, so evidence from every
        // Domain lands in one snapshot rather than being filtered away (ADR 0010).
        var wholeQuiz = new HashSet<int> { 1, 2, 99 }; // 99 belongs to another Domain
        var attempt = Attempt(1, new DateTime(2026, 1, 1), finished: true,
            served: [1, 2, 99], correct: [1], wrong: [2, 99]);

        var snapshot = OutcomeSnapshot.Build([attempt], wholeQuiz);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(2));
        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(99)); // cross-Domain, and in scope
        Assert.Equal([1, 2, 99], snapshot.Cooldown.Order());
    }

    [Fact]
    public void Build_LeavesPriorMissed_WhenAMistakesAttemptGetsItRight()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [], wrong: [1]),
            Attempt(2, new DateTime(2026, 6, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_LeavesRecencyAndMissCount_WhenAMistakesAttemptGetsItRight()
    {
        var firstMiss = new DateTime(2026, 1, 1);
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, firstMiss, finished: true, served: [1], correct: [], wrong: [1]),
            Attempt(2, new DateTime(2026, 6, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
        Assert.Equal(1, snapshot.Outcomes[1].MissCount);
        Assert.Equal(firstMiss, snapshot.Outcomes[1].LastMissedAt);
    }

    [Fact]
    public void Build_LeavesUnseen_WhenAMistakesAttemptGetsAnUnseenQuestionRight()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Unseen, snapshot.OutcomeOf(1));
        Assert.False(snapshot.Outcomes.ContainsKey(1));
    }

    [Fact]
    public void Build_WritesMissedFromAWrongCheckInAMistakesAttempt()
    {
        var at = new DateTime(2026, 6, 1);
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [], wrong: [1]),
            Attempt(2, at, finished: true, served: [1], correct: [], wrong: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
        Assert.Equal(2, snapshot.Outcomes[1].MissCount);
        Assert.Equal(at, snapshot.Outcomes[1].LastMissedAt);
    }

    [Fact]
    public void Build_WritesMissedFromAServedSkipInAMistakesAttempt()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMissedFromNullCorrectnessInAMistakesAttempt()
    {
        var attempt = Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
            drawRule: DrawRule.Mistakes);
        attempt.RecordedAnswers[0].IsCorrect = null;

        var snapshot = OutcomeSnapshot.Build([attempt], DomainQuestions);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMasteredFromARightCheckInADrillMixAttempt()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.DrillMix),
        ], DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMasteredFromARightAnswerOnAnExam()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1]),
        ], DomainQuestions);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_IgnoresUnfinishedMistakesAttempts()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: false, served: [1], correct: [], wrong: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions);

        Assert.Equal(Outcome.Unseen, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_LetsAnExamOverwriteAMistakesAttempt_InBothDirections()
    {
        var toMastered = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [], wrong: [1],
                drawRule: DrawRule.Mistakes),
            Attempt(2, new DateTime(2026, 2, 1), finished: true, served: [1], correct: [1]),
        ], DomainQuestions);

        var toMissed = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.DrillMix),
            Attempt(2, new DateTime(2026, 2, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.Mistakes),
            Attempt(3, new DateTime(2026, 3, 1), finished: true, served: [1], correct: [], wrong: [1]),
        ], DomainQuestions);

        Assert.Equal(Outcome.Mastered, toMastered.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, toMissed.OutcomeOf(1));
    }
}

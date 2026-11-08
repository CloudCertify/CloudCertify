using API.Entities;
using API.Services.Drills;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

/// <summary>
/// The draw is random among Unseen and ordered by Recall elsewhere, so most of these assert its
/// <em>composition</em> — how many Missed/Due/Unseen/Mastered came back going in — and only
/// assert identity where Recall order decides it (ADR 0008, ADR 0013).
/// </summary>
public class DrillMixTests
{
    private const string Domain = "Security and Compliance";
    private static readonly DateTime Now = new(2026, 12, 1);

    private enum Seat { Missed, Due, Unseen, Mastered }

    private static List<Question> Bank(int count, int firstId = 1) =>
        Enumerable.Range(firstId, count)
            .Select(i => Question(i, Domain, correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToList();

    private static int[] Ids(int first, int count) => Enumerable.Range(first, count).ToArray();

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
        OutcomeSnapshot.Build(submissions, bank.Select(q => q.Id).ToHashSet(), Now);

    private static Seat SeatOf(OutcomeSnapshot snapshot, int id) => snapshot.OutcomeOf(id) switch
    {
        Outcome.Missed => Seat.Missed,
        Outcome.Unseen => Seat.Unseen,
        _ => snapshot.IsDue(id) ? Seat.Due : Seat.Mastered,
    };

    private static int CountOf(List<Question> drill, OutcomeSnapshot snapshot, Seat seat) =>
        drill.Count(q => SeatOf(snapshot, q.Id) == seat);

    [Fact]
    public void Draw_FillsElevenMissedAndFourUnseen_WhenEveryPoolIsDeep()
    {
        var bank = Bank(80);
        // 1-20 missed, 21-40 proved long ago (Due), 41-60 proved just now (not Due), 61-80 unseen.
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 40), correct: Ids(21, 20)),
            Finished(2, Now, served: Ids(41, 20), correct: Ids(41, 20)));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(11, CountOf(drill, snapshot, Seat.Missed));
        Assert.Equal(4, CountOf(drill, snapshot, Seat.Unseen));
        Assert.Equal(0, CountOf(drill, snapshot, Seat.Due));
        Assert.Equal(0, CountOf(drill, snapshot, Seat.Mastered));
    }

    [Fact]
    public void Draw_SeatsDueAfterMissed_LowestRecallFirst()
    {
        var bank = Bank(55);
        // 1-5 missed. 6-25 each proved once, k days ago for k = 2..21: Recall 2^-k, so the
        // oldest proofs (20-25) are the most forgotten. 26-55 unseen.
        var history = new List<Submission>
        {
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 5), correct: []),
        };
        history.AddRange(Enumerable.Range(6, 20).Reverse()
            .Select(q => Finished(q, Now.AddDays(-(q - 4)), served: [q], correct: [q])));
        var snapshot = SnapshotOf(bank, history.ToArray());

        var drill = DrillMix.Draw(bank, snapshot);
        var due = drill.Where(q => SeatOf(snapshot, q.Id) == Seat.Due).Select(q => q.Id).Order();

        Assert.Equal(5, CountOf(drill, snapshot, Seat.Missed));
        Assert.Equal([20, 21, 22, 23, 24, 25], due);
        Assert.Equal(4, CountOf(drill, snapshot, Seat.Unseen));
    }

    [Fact]
    public void Draw_ReturnsFifteenUnseen_WhenUserHasNoHistory()
    {
        // Degrades to today's uniform random draw with no special case in the selection.
        var bank = Bank(60);

        var drill = DrillMix.Draw(bank, OutcomeSnapshot.Empty);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(DrillMix.Size, CountOf(drill, OutcomeSnapshot.Empty, Seat.Unseen));
        Assert.Equal(DrillMix.Size, drill.Select(q => q.Id).Distinct().Count());
    }

    [Fact]
    public void Draw_SpillsShortReviewIntoUnseen()
    {
        var bank = Bank(60);
        // Only 3 missed and nothing Due; 20 fresh Mastered must stay out while Unseen lasts.
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 3), correct: []),
            Finished(2, Now, served: Ids(4, 20), correct: Ids(4, 20)));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(3, CountOf(drill, snapshot, Seat.Missed));
        Assert.Equal(12, CountOf(drill, snapshot, Seat.Unseen)); // 4 own + 8 spilled
        Assert.Equal(0, CountOf(drill, snapshot, Seat.Mastered));
    }

    [Fact]
    public void Draw_SpillsShortUnseenIntoReview()
    {
        var bank = Bank(22);
        // 10 missed, 10 Due, 2 unseen: Unseen's 2 missing seats go to the next-lowest Recall.
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 20), correct: Ids(11, 10)));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(10, CountOf(drill, snapshot, Seat.Missed));
        Assert.Equal(3, CountOf(drill, snapshot, Seat.Due));
        Assert.Equal(2, CountOf(drill, snapshot, Seat.Unseen));
    }

    [Fact]
    public void Draw_ServesNotDueMastered_OnlyWhenBothSidesRunDry_LowestRecallFirst()
    {
        var bank = Bank(28);
        // 1-2 missed, 3 Due, 4-5 unseen. 6-28 proved h = 1..23 hours ago: Mastered, none Due yet,
        // and the ones proved longest ago (19-28) have the lowest Recall.
        var history = new List<Submission>
        {
            Finished(1, new DateTime(2026, 1, 1), served: [1, 2, 3], correct: [3]),
        };
        history.AddRange(Enumerable.Range(6, 23).Reverse()
            .Select(q => Finished(q, Now.AddHours(-(q - 5)), served: [q], correct: [q])));
        var snapshot = SnapshotOf(bank, history.ToArray());

        var drill = DrillMix.Draw(bank, snapshot);
        var mastered = drill.Where(q => SeatOf(snapshot, q.Id) == Seat.Mastered).Select(q => q.Id).Order();

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(2, CountOf(drill, snapshot, Seat.Missed));
        Assert.Equal(1, CountOf(drill, snapshot, Seat.Due));
        Assert.Equal(2, CountOf(drill, snapshot, Seat.Unseen));
        Assert.Equal(Enumerable.Range(19, 10), mastered); // the 10 proved longest ago
    }

    [Fact]
    public void Draw_IsAlwaysFifteenDistinctQuestions_WhenBankIsThinEnoughToForceRepeatsAcrossAttempts()
    {
        // A 16-question bank cannot honour the cooldown: 15 of the 16 were served last time.
        var bank = Bank(16);
        var snapshot = SnapshotOf(bank, Finished(1, Now, served: Ids(1, 15), correct: Ids(1, 15)));

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
        var lastAttempt = Ids(21, 15);
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 20), correct: []),
            Finished(2, new DateTime(2026, 6, 1), served: lastAttempt, correct: []));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(11, CountOf(drill, snapshot, Seat.Missed));
        Assert.DoesNotContain(drill, q => lastAttempt.Contains(q.Id));
    }

    [Fact]
    public void Draw_DropsTheCooldown_RatherThanLeaveTheReviewShort()
    {
        var bank = Bank(30);
        // Every missed Question is also cooled down; the review cannot be filled otherwise.
        var snapshot = SnapshotOf(bank, Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 15), correct: []));

        var drill = DrillMix.Draw(bank, snapshot);

        Assert.Equal(DrillMix.Size, drill.Count);
        Assert.Equal(11, CountOf(drill, snapshot, Seat.Missed));
    }

    [Fact]
    public void Draw_PrefersTheMostRecentlyMissed()
    {
        var bank = Bank(40);
        // 1-10 missed long ago, 11-20 missed later, then a clean attempt on 21-30 so the cooldown
        // sits on neither group and recency alone decides. All ten later misses get a seat; the
        // eleventh goes to an older miss, ahead of the Due 21-30.
        var snapshot = SnapshotOf(bank,
            Finished(1, new DateTime(2026, 1, 1), served: Ids(1, 10), correct: []),
            Finished(2, new DateTime(2026, 6, 1), served: Ids(11, 10), correct: []),
            Finished(3, new DateTime(2026, 7, 1), served: Ids(21, 10), correct: Ids(21, 10)));

        var drill = DrillMix.Draw(bank, snapshot);
        var missed = drill.Where(q => SeatOf(snapshot, q.Id) == Seat.Missed).Select(q => q.Id).ToList();

        Assert.Equal(11, missed.Count);
        Assert.Equal(10, missed.Count(id => id is >= 11 and <= 20));
        Assert.Equal(0, CountOf(drill, snapshot, Seat.Due));
    }
}

/// <summary>Reading Outcomes off a User's Submissions — the evidence half of ADR 0008.</summary>
public class OutcomeSnapshotTests
{
    private static readonly HashSet<int> DomainQuestions = Enumerable.Range(1, 10).ToHashSet();
    private static readonly DateTime Now = new(2026, 12, 1);

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
            DomainQuestions, Now);

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
            DomainQuestions, Now);

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
        ], DomainQuestions, Now);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_ReadsEvidenceFromFullQuizAttempts()
    {
        // A full Quiz Submission (no DrillId) still feeds the matching Domain's drill.
        var fullQuiz = Attempt(1, new DateTime(2026, 1, 1), finished: true,
            served: [1, 2, 3, 99], correct: [1], wrong: [2, 3]);

        var snapshot = OutcomeSnapshot.Build([fullQuiz], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

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

        var snapshot = OutcomeSnapshot.Build([attempt], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

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

        var snapshot = OutcomeSnapshot.Build([attempt], wholeQuiz, Now);

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
        ], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMissedFromNullCorrectnessInAMistakesAttempt()
    {
        var attempt = Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
            drawRule: DrawRule.Mistakes);
        attempt.RecordedAnswers[0].IsCorrect = null;

        var snapshot = OutcomeSnapshot.Build([attempt], DomainQuestions, Now);

        Assert.Equal(Outcome.Missed, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMasteredFromARightCheckInADrillMixAttempt()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.DrillMix),
        ], DomainQuestions, Now);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_WritesMasteredFromARightAnswerOnAnExam()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1]),
        ], DomainQuestions, Now);

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
    }

    [Fact]
    public void Build_IgnoresUnfinishedMistakesAttempts()
    {
        var snapshot = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: false, served: [1], correct: [], wrong: [1],
                drawRule: DrawRule.Mistakes),
        ], DomainQuestions, Now);

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
        ], DomainQuestions, Now);

        var toMissed = OutcomeSnapshot.Build(
        [
            Attempt(1, new DateTime(2026, 1, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.DrillMix),
            Attempt(2, new DateTime(2026, 2, 1), finished: true, served: [1], correct: [1],
                drawRule: DrawRule.Mistakes),
            Attempt(3, new DateTime(2026, 3, 1), finished: true, served: [1], correct: [], wrong: [1]),
        ], DomainQuestions, Now);

        Assert.Equal(Outcome.Mastered, toMastered.OutcomeOf(1));
        Assert.Equal(Outcome.Missed, toMissed.OutcomeOf(1));
    }
}

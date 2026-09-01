using API.Entities;
using API.Services.Drills;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

/// <summary>
/// The review draw (ADR 0011). Unlike <see cref="DrillMix"/> these assert Question identity:
/// seating order is the decision here — Missed first by recency, then the low ratings — and the
/// only randomness is the presentation shuffle.
/// </summary>
public class MistakesDrawTests
{
    private const int DrillId = 2;

    private static List<Question> Bank(int count, int firstId = 1) =>
        Enumerable.Range(firstId, count)
            .Select(i => Question(i, "D", correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToList();

    /// <summary>A finished Practice attempt on <paramref name="drillId"/>.</summary>
    private static Submission Practice(int id, DateTime at, int[] served, int[] correct, int drillId = 99) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = true, CreatedAt = at,
            DrillId = drillId, Mode = Mode.Practice,
            ServedQuestionIds = served.ToList(),
            RecordedAnswers = served
                .Select(q => new RecordedAnswer { QuestionId = q, IsCorrect = correct.Contains(q) })
                .ToList()
        };

    /// <summary>A finished full Quiz attempt carrying <paramref name="ratings"/>.</summary>
    private static Submission Exam(int id, DateTime at, params (int QuestionId, Confidence? Rating, bool Correct)[] ratings) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = true, CreatedAt = at, Mode = Mode.Exam,
            ServedQuestionIds = ratings.Select(r => r.QuestionId).ToList(),
            RecordedAnswers = ratings
                .Select(r => new RecordedAnswer
                {
                    QuestionId = r.QuestionId, Confidence = r.Rating, IsCorrect = r.Correct
                })
                .ToList()
        };

    private static MistakesSnapshot SnapshotOf(List<Question> bank, params Submission[] submissions) =>
        MistakesSnapshot.Build(submissions, bank.Select(q => q.Id).ToHashSet(), DrillId);

    private static List<int> DrawIds(List<Question> bank, MistakesSnapshot snapshot) =>
        MistakesDraw.Draw(bank, snapshot).Select(q => q.Id).ToList();

    [Fact]
    public void Draw_ReturnsNothing_WhenThereAreNoMissesAndNoLowRatings()
    {
        // The empty gate: everything either mastered, unrated, or rated Confident.
        var bank = Bank(20);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: [1, 2], correct: [1, 2]),
            Exam(2, new DateTime(2026, 2, 1), (3, Confidence.Confident, true), (4, null, true)));

        Assert.Empty(MistakesDraw.Draw(bank, snapshot));
    }

    [Fact]
    public void Draw_ReturnsTheWholeUnion_WhenItIsShorterThanTheCap()
    {
        // Three in the union is a three-Question drill: no padding with Unseen or Mastered.
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: [1, 2], correct: []),
            Exam(2, new DateTime(2026, 2, 1), (3, Confidence.Guess, true)));

        Assert.Equal([1, 2, 3], DrawIds(bank, snapshot).Order());
    }

    [Fact]
    public void Draw_CapsAtFifteen()
    {
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 40).ToArray(), correct: []));

        Assert.Equal(MistakesDraw.Cap, DrawIds(bank, snapshot).Count);
    }

    [Fact]
    public void Draw_TakesALuckyGuess_EvenThoughItWasCorrect()
    {
        // The point of collecting Confidence: correct plus Guess is exactly what a score hides.
        var bank = Bank(10);
        var snapshot = SnapshotOf(bank, Exam(1, new DateTime(2026, 1, 1), (5, Confidence.Guess, true)));

        Assert.Equal([5], DrawIds(bank, snapshot));
    }

    [Fact]
    public void Draw_TakesUnsure_AndLeavesConfidentAndUnratedOut()
    {
        var bank = Bank(10);
        var snapshot = SnapshotOf(bank, Exam(1, new DateTime(2026, 1, 1),
            (1, Confidence.Unsure, true), (2, Confidence.Confident, true), (3, null, true)));

        Assert.Equal([1], DrawIds(bank, snapshot));
    }

    [Fact]
    public void Draw_SeatsAQuestionOnce_WhenItIsBothMissedAndLowRated()
    {
        var bank = Bank(10);
        var snapshot = SnapshotOf(bank, Exam(1, new DateTime(2026, 1, 1), (1, Confidence.Guess, false)));

        Assert.Equal([1], DrawIds(bank, snapshot));
    }

    [Fact]
    public void Draw_SeatsMissedFirst_LeavingLowRatingsOutWhenTheMissesFillTheDrill()
    {
        // The cost stated in ADR 0011: 15 or more Missed and no low-confidence Question is seen.
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 20).ToArray(), correct: []),
            Exam(2, new DateTime(2026, 2, 1), (41, Confidence.Guess, true), (42, Confidence.Unsure, true)));

        var drawn = DrawIds(bank, snapshot);

        Assert.Equal(MistakesDraw.Cap, drawn.Count);
        Assert.All(drawn, id => Assert.InRange(id, 1, 20));
    }

    [Fact]
    public void Draw_FillsTheRemainingSeatsWithTheMostRecentlyRated()
    {
        // 12 misses leave 3 seats; the newest ratings take them.
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 12).ToArray(), correct: []),
            Exam(2, new DateTime(2026, 2, 1),
                (41, Confidence.Guess, true), (42, Confidence.Guess, true)),
            Exam(3, new DateTime(2026, 3, 1),
                (43, Confidence.Unsure, true), (44, Confidence.Guess, true), (45, Confidence.Guess, true)));

        var drawn = DrawIds(bank, snapshot);

        Assert.Equal(MistakesDraw.Cap, drawn.Count);
        Assert.Equal([43, 44, 45], drawn.Where(id => id > 12).Order());
    }

    [Fact]
    public void Draw_PrefersTheMostRecentlyMissed_MissCountBreakingTies()
    {
        var bank = Bank(60);
        // 1-10 missed once long ago; 11-20 missed in June. Only 15 seats.
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 10).ToArray(), correct: []),
            Practice(2, new DateTime(2026, 6, 1), served: Enumerable.Range(11, 10).ToArray(), correct: []));

        var drawn = DrawIds(bank, snapshot);

        Assert.Equal(MistakesDraw.Cap, drawn.Count);
        Assert.All(Enumerable.Range(11, 10), id => Assert.Contains(id, drawn)); // June's misses, all of them
    }

    [Fact]
    public void Draw_ForgetsAQuestionRatedConfidentSinceItWasGuessed()
    {
        // Latest non-null rating wins, and Confident leaves the set.
        var bank = Bank(10);
        var snapshot = SnapshotOf(bank,
            Exam(1, new DateTime(2026, 1, 1), (1, Confidence.Guess, true)),
            Exam(2, new DateTime(2026, 6, 1), (1, Confidence.Confident, true)));

        Assert.Empty(MistakesDraw.Draw(bank, snapshot));
    }

    [Fact]
    public void Draw_KeepsALowRating_WhenTheNextAttemptLeftItUnrated()
    {
        // Silence is not a vote: an unrated answer neither joins nor evicts.
        var bank = Bank(10);
        var snapshot = SnapshotOf(bank,
            Exam(1, new DateTime(2026, 1, 1), (1, Confidence.Guess, true)),
            Exam(2, new DateTime(2026, 6, 1), (1, null, true)));

        Assert.Equal([1], DrawIds(bank, snapshot));
    }

    [Fact]
    public void Draw_IgnoresRatingsOnUnfinishedAttempts()
    {
        var bank = Bank(10);
        var unfinished = Exam(1, new DateTime(2026, 1, 1), (1, Confidence.Guess, true));
        unfinished.Finished = false;

        Assert.Empty(MistakesDraw.Draw(bank, SnapshotOf(bank, unfinished)));
    }

    [Fact]
    public void Draw_SkipsTheLastReviewAttemptsQuestions_WhenTheUnionCanAffordIt()
    {
        var bank = Bank(60);
        // 35 misses, 15 of which the last Mistakes attempt just served — and just re-missed, so
        // they are also the most recent. The cooldown outranks that recency.
        var lastReview = Enumerable.Range(1, 15).ToArray();
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: Enumerable.Range(1, 35).ToArray(), correct: []),
            Practice(2, new DateTime(2026, 6, 1), served: lastReview, correct: [], drillId: DrillId));

        var drawn = DrawIds(bank, snapshot);

        Assert.Equal(MistakesDraw.Cap, drawn.Count);
        Assert.DoesNotContain(drawn, id => lastReview.Contains(id));
    }

    [Fact]
    public void Draw_RepeatsTheLastReviewAttempt_RatherThanShrink()
    {
        // Tiny bank: the cooldown drops rather than cost the drill a member.
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: [1, 2, 3], correct: [], drillId: DrillId));

        Assert.Equal([1, 2, 3], DrawIds(bank, snapshot).Order());
    }

    [Fact]
    public void Draw_IgnoresTheCooldownOfOtherDrills()
    {
        // Only the last Mistakes attempt cools down; a Drill Mix attempt is another drill's business.
        var bank = Bank(60);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: [1, 2, 3], correct: [], drillId: 99));

        Assert.Equal([1, 2, 3], DrawIds(bank, snapshot).Order());
    }

    [Fact]
    public void Draw_StaysInScope()
    {
        // The scope is the parent Quiz; evidence on a Question of another Quiz never seats.
        var bank = Bank(5);
        var snapshot = SnapshotOf(bank,
            Practice(1, new DateTime(2026, 1, 1), served: [1, 900], correct: []),
            Exam(2, new DateTime(2026, 2, 1), (901, Confidence.Guess, true)));

        Assert.Equal([1], DrawIds(bank, snapshot));
    }
}

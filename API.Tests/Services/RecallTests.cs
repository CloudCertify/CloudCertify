using API.Entities;
using API.Services.Drills;

namespace API.Tests.Services;

/// <summary>
/// Recall read off the same oldest-first fold as Outcome (ADR 0013). Every test states its own
/// "now", so the clock is part of the input rather than the machine's.
/// </summary>
public class RecallTests
{
    private static readonly DateTime T0 = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly HashSet<int> Scope = [1, 2];

    private static Submission FinishedSubmission(int id, DateTime at, bool correct, Mode mode = Mode.Practice,
        DrawRule? drawRule = DrawRule.DrillMix) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = true, CreatedAt = at, Mode = mode, DrawRule = drawRule,
            ServedQuestionIds = [1],
            RecordedAnswers = [new RecordedAnswer { QuestionId = 1, IsCorrect = correct }],
        };

    private static Submission Right(int id, DateTime at) => FinishedSubmission(id, at, correct: true);
    private static Submission Wrong(int id, DateTime at) => FinishedSubmission(id, at, correct: false);

    private static OutcomeSnapshot At(DateTime now, params Submission[] submissions) =>
        OutcomeSnapshot.Build(submissions, Scope, now);

    [Fact]
    public void FirstRightAnswer_IsRecallOne_AndDueAfterOneDay()
    {
        var history = Right(1, T0);

        Assert.Equal(1.0, At(T0, history).RecallOf(1));
        Assert.False(At(T0.AddHours(23), history).IsDue(1));
        Assert.Equal(0.5, At(T0.AddDays(1), history).RecallOf(1));
        Assert.True(At(T0.AddDays(1), history).IsDue(1));
        Assert.Equal(1, At(T0, history).Outcomes[1].HalfLifeDays);
    }

    [Fact]
    public void RightWhileDue_ClimbsTheLadder_AndStaysAtThirty()
    {
        // Each answer lands exactly when the previous half-life runs out, so each one proves.
        var at = T0;
        var history = new List<Submission> { Right(1, at) };
        var climbed = new List<int>();
        foreach (var (gap, id) in new[] { 1, 3, 7, 14, 30, 30 }.Select((g, i) => (g, i + 2)))
        {
            at = at.AddDays(gap);
            history.Add(Right(id, at));
            climbed.Add(OutcomeSnapshot.Build(history, Scope, at).Outcomes[1].HalfLifeDays);
        }

        Assert.Equal([3, 7, 14, 30, 30, 30], climbed);
    }

    [Fact]
    public void RightBeforeDue_ChangesNothing()
    {
        var snapshot = At(T0.AddHours(18), Right(1, T0), Right(2, T0.AddHours(12)));

        var outcome = snapshot.Outcomes[1];
        Assert.Equal(1, outcome.HalfLifeDays);
        Assert.Equal(T0, outcome.LastProvedAt);
        Assert.Equal(Math.Pow(2, -0.75), snapshot.RecallOf(1)!.Value, 10);
    }

    [Fact]
    public void Miss_ResetsToMissedAndTheFirstRung()
    {
        var missedAt = T0.AddDays(2);
        var snapshot = At(missedAt, Right(1, T0), Right(2, T0.AddDays(1)), Wrong(3, missedAt));

        var outcome = snapshot.Outcomes[1];
        Assert.Equal(Outcome.Missed, outcome.Outcome);
        Assert.Equal(1, outcome.HalfLifeDays);
        Assert.Equal(missedAt, outcome.LastMissedAt);
        Assert.Equal(1, outcome.MissCount);
        Assert.Equal(0.0, snapshot.RecallOf(1));
        Assert.False(snapshot.IsDue(1));
    }

    [Fact]
    public void FirstRightAfterMissed_ProvesFromTheFirstRung()
    {
        var provedAt = T0.AddDays(3);
        var snapshot = At(provedAt, Right(1, T0), Right(2, T0.AddDays(1)), Wrong(3, T0.AddDays(2)),
            Right(4, provedAt));

        Assert.Equal(Outcome.Mastered, snapshot.OutcomeOf(1));
        Assert.Equal(1, snapshot.Outcomes[1].HalfLifeDays);
        Assert.Equal(1.0, snapshot.RecallOf(1));
    }

    [Fact]
    public void MistakesRightCheck_ProvesNothing_EvenWhileDue()
    {
        var snapshot = At(T0.AddDays(2), Right(1, T0),
            FinishedSubmission(2, T0.AddDays(2), correct: true, drawRule: DrawRule.Mistakes));

        Assert.Equal(1, snapshot.Outcomes[1].HalfLifeDays);
        Assert.Equal(T0, snapshot.Outcomes[1].LastProvedAt);
        Assert.True(snapshot.IsDue(1));
    }

    [Fact]
    public void ExamRightWhileDue_Proves()
    {
        var examAt = T0.AddDays(1);
        var snapshot = At(examAt, Right(1, T0), FinishedSubmission(2, examAt, correct: true, Mode.Exam, drawRule: null));

        Assert.Equal(3, snapshot.Outcomes[1].HalfLifeDays);
        Assert.Equal(examAt, snapshot.Outcomes[1].LastProvedAt);
        Assert.Equal(1.0, snapshot.RecallOf(1));
    }

    [Fact]
    public void UnseenHasNoRecall()
    {
        var snapshot = At(T0, Right(1, T0));

        Assert.Null(snapshot.RecallOf(2));
        Assert.False(snapshot.IsDue(2));
        Assert.Null(OutcomeSnapshot.Empty.RecallOf(1));
    }
}

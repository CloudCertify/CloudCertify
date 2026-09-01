using API.Dto;
using API.Entities;
using API.Repositories;
using API.Services;
using Moq;

namespace API.Tests.Services;

/// <summary>
/// Progress read model: Standing, trend, delta, and the 5-seen lead floor
/// (issues #61 / #73). Built from finished Submissions the way OutcomeSnapshot is.
/// </summary>
public class ProgressServiceTests
{
    private static readonly DateTime T0 = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static Question Q(int id, string domain) => new() { Id = id, QuizId = 1, Domain = domain };

    private static readonly Question[] Bank =
    [
        Q(1, "Cloud Concepts"), Q(2, "Cloud Concepts"), Q(3, "Cloud Concepts"),
        Q(4, "Cloud Concepts"), Q(5, "Cloud Concepts"), Q(6, "Cloud Concepts"),
        Q(10, "Security"), Q(11, "Security"), Q(12, "Security"),
        Q(13, "Security"), Q(14, "Security"),
        Q(20, "Billing"), Q(21, "Billing"), Q(22, "Billing"), Q(23, "Billing"), Q(24, "Billing"),
    ];

    private static Submission Attempt(
        int id, DateTime at, Mode mode, params (int QuestionId, bool? Correct)[] answers) =>
        new()
        {
            Id = id,
            QuizId = 1,
            UserId = 7,
            Finished = true,
            Mode = mode,
            CreatedAt = at,
            ServedQuestionIds = answers.Select(a => a.QuestionId).ToList(),
            RecordedAnswers = answers
                .Select(a => new RecordedAnswer { QuestionId = a.QuestionId, IsCorrect = a.Correct })
                .ToList(),
        };

    private static Submission Drill(int id, DateTime at, params (int QuestionId, bool? Correct)[] answers) =>
        Attempt(id, at, Mode.Practice, answers);

    private static Submission Exam(int id, DateTime at, params (int QuestionId, bool? Correct)[] answers) =>
        Attempt(id, at, Mode.Exam, answers);

    private static DomainStandingDto Domain(ProgressDto progress, string name) =>
        Assert.Single(progress.Domains, d => d.Name == name);

    [Fact]
    public void DrillOnlyVisitor_HasStanding_NoTrend_NullDelta()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0,
                (1, true), (2, true), (3, false), (4, true), (5, true),
                (10, false), (11, false)),
        ], Bank);

        Assert.Equal(0, progress.FinishedExams);
        Assert.Equal(1, progress.FinishedDrills);
        Assert.Empty(progress.Trend);
        Assert.Equal(80, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(5, Domain(progress, "Cloud Concepts").Seen);
        Assert.Null(Domain(progress, "Cloud Concepts").Delta);
        Assert.Equal(0, Domain(progress, "Security").Standing);
        Assert.Equal(2, Domain(progress, "Security").Seen);
        Assert.Null(Domain(progress, "Security").Delta);
    }

    [Fact]
    public void NullIsCorrect_CountsAsNotMastered()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0, (1, true), (2, null), (3, false)),
        ], Bank);

        Assert.Equal(33, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(3, Domain(progress, "Cloud Concepts").Seen);
    }

    [Fact]
    public void LatestAttemptWins_PerQuestion()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0, (1, false), (2, false), (3, true)),
            Drill(2, T0.AddHours(1), (1, true), (2, false)),
        ], Bank);

        // Q1 mastered on the later drill, Q2 still missed, Q3 mastered from the first.
        Assert.Equal(67, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(3, Domain(progress, "Cloud Concepts").Seen);
    }

    [Fact]
    public void OneExam_NullDelta_AndATrendPoint()
    {
        var progress = ProgressService.Build(
        [
            Exam(9, T0,
                (1, true), (2, true), (3, true), (4, false), (5, true)),
        ], Bank);

        Assert.Equal(1, progress.FinishedExams);
        Assert.Equal(0, progress.FinishedDrills);
        Assert.Null(Domain(progress, "Cloud Concepts").Delta);
        var point = Assert.Single(progress.Trend);
        Assert.Equal(9, point.SubmissionId);
        Assert.Equal(T0, point.CreatedAt);
        Assert.Equal(80, point.Percent);
    }

    [Fact]
    public void SecondExam_SetsDeltaVersusPreviousExamStanding()
    {
        var first = Exam(1, T0,
            (1, true), (2, false), (3, false), (4, false), (5, false));
        var second = Exam(2, T0.AddDays(1),
            (1, true), (2, true), (3, true), (4, true), (5, false));

        var progress = ProgressService.Build([first, second], Bank);

        Assert.Equal(2, progress.FinishedExams);
        Assert.Equal(80, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(60, Domain(progress, "Cloud Concepts").Delta);
        Assert.Equal(2, progress.Trend.Count);
        Assert.Equal(1, progress.Trend[0].SubmissionId);
        Assert.Equal(20, progress.Trend[0].Percent);
        Assert.Equal(2, progress.Trend[1].SubmissionId);
        Assert.Equal(80, progress.Trend[1].Percent);
    }

    [Fact]
    public void Lead_RequiresFiveSeen_EvenWhenWeaker()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0,
                (10, false), (11, false), (12, false), (13, false),
                (1, true), (2, true), (3, true), (4, true), (5, true)),
        ], Bank);

        Assert.Equal(0, Domain(progress, "Security").Standing);
        Assert.Equal(4, Domain(progress, "Security").Seen);
        Assert.Equal(100, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal("Cloud Concepts", progress.Lead);
    }

    [Fact]
    public void Lead_IsTheWeakestEligibleDomain()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0,
                (1, true), (2, true), (3, true), (4, true), (5, true),
                (10, false), (11, false), (12, false), (13, false), (14, false)),
        ], Bank);

        Assert.Equal(100, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(0, Domain(progress, "Security").Standing);
        Assert.Equal("Security", progress.Lead);
    }

    [Fact]
    public void Lead_TieOnStanding_PrefersMoreSeen()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0,
                (1, false), (2, false), (3, false), (4, false), (5, false), (6, false),
                (10, false), (11, false), (12, false), (13, false), (14, false)),
        ], Bank);

        Assert.Equal(0, Domain(progress, "Cloud Concepts").Standing);
        Assert.Equal(0, Domain(progress, "Security").Standing);
        Assert.Equal(6, Domain(progress, "Cloud Concepts").Seen);
        Assert.Equal(5, Domain(progress, "Security").Seen);
        Assert.Equal("Cloud Concepts", progress.Lead);
    }

    [Fact]
    public void Lead_TieOnStandingAndSeen_PrefersName()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0,
                (20, false), (21, false), (22, false), (23, false), (24, false),
                (10, false), (11, false), (12, false), (13, false), (14, false)),
        ], Bank);

        Assert.Equal(5, Domain(progress, "Billing").Seen);
        Assert.Equal(5, Domain(progress, "Security").Seen);
        Assert.Equal("Billing", progress.Lead);
    }

    [Fact]
    public void Lead_NullWhenNoDomainHasFiveSeen()
    {
        var progress = ProgressService.Build(
        [
            Drill(1, T0, (1, true), (10, false)),
        ], Bank);

        Assert.Null(progress.Lead);
    }

    [Fact]
    public void UnfinishedAttempt_ContributesNothing()
    {
        var abandoned = Attempt(1, T0, Mode.Practice, (1, true), (2, true));
        abandoned.Finished = false;

        var progress = ProgressService.Build([abandoned], Bank);

        Assert.Equal(0, progress.FinishedDrills);
        Assert.Empty(progress.Domains);
        Assert.Null(progress.Lead);
    }

    [Fact]
    public void Trend_KeepsNewestTenExams_Chronological()
    {
        var exams = Enumerable.Range(1, 12)
            .Select(i => Exam(i, T0.AddDays(i), (1, i % 2 == 0)))
            .ToList();

        var progress = ProgressService.Build(exams, Bank);

        Assert.Equal(12, progress.FinishedExams);
        Assert.Equal(10, progress.Trend.Count);
        Assert.Equal(3, progress.Trend[0].SubmissionId);
        Assert.Equal(12, progress.Trend[^1].SubmissionId);
    }

    [Fact]
    public async Task ListQuizzes_OnlyThoseWithAFinishedSubmission()
    {
        var submissions = new Mock<ISubmissionRepository>();
        submissions.Setup(r => r.GetByUserId(7)).ReturnsAsync(
        [
            new Submission { Id = 1, QuizId = 10, UserId = 7, Finished = true, Mode = Mode.Practice },
            new Submission { Id = 2, QuizId = 11, UserId = 7, Finished = false, Mode = Mode.Exam },
        ]);
        var quizzes = new Mock<IQuizRepository>();
        quizzes.Setup(r => r.GetQuizzes()).ReturnsAsync(
        [
            new Quiz { Id = 10, Title = "CLF", Description = "", IconName = "aws", Slug = "clf" },
            new Quiz { Id = 11, Title = "SAA", Description = "", IconName = "aws", Slug = "saa" },
        ]);

        var listed = await new ProgressService(
                submissions.Object, new Mock<IQuestionRepository>().Object, quizzes.Object)
            .ListQuizzes(7);

        var quiz = Assert.Single(listed);
        Assert.Equal(10, quiz.Id);
        Assert.Equal("clf", quiz.Slug);
    }

    [Fact]
    public async Task Get_ReturnsNull_WhenQuizMissing()
    {
        var quizzes = new Mock<IQuizRepository>();
        quizzes.Setup(r => r.GetQuizById(99)).ReturnsAsync((Quiz?)null);

        var result = await new ProgressService(
                new Mock<ISubmissionRepository>().Object,
                new Mock<IQuestionRepository>().Object,
                quizzes.Object)
            .Get(7, 99);

        Assert.Null(result);
    }
}

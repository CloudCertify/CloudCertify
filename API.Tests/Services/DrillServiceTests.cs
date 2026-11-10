using API.Entities;
using API.Model.Request;
using API.Repositories;
using API.Services;
using API.Services.Drills;
using Moq;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

public class DrillServiceTests
{
    private readonly Mock<IDrillRepository> _drills = new();
    private readonly Mock<IQuizRepository> _quizzes = new();
    private readonly Mock<IQuestionRepository> _questions = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    public DrillServiceTests()
    {
        // FinishDrill hands the grader the parent Quiz; any id resolves to an uncataloged Quiz.
        _quizzes.Setup(r => r.GetQuizById(It.IsAny<int>())).ReturnsAsync((int id) => new Quiz { Id = id, Slug = "XYZ-C99" });
    }

    private DrillService CreateService(DateTime? now = null) =>
        new(_drills.Object, _quizzes.Object, _questions.Object, _submissions.Object,
            new SubmissionGrader(_questions.Object, _submissions.Object), new FixedClock(now ?? Now));

    /// <summary>"Now" for every drill start: well after the fixtures' history, so a proof is Due.</summary>
    private static readonly DateTime Now = new(2026, 12, 1);

    [Fact]
    public async Task GetDrillsByQuizId_ListsTheWholeQuizMixFirst()
    {
        _drills.Setup(r => r.GetDrillsByQuizId(1)).ReturnsAsync(
        [
            new Drill { Id = 1, QuizId = 1, Title = "Domain A", Domain = "A", DrawRule = DrawRule.DrillMix, Slug = "a" },
            new Drill { Id = 2, QuizId = 1, Title = "Mistakes", DrawRule = DrawRule.Mistakes, Slug = "m" },
            new Drill { Id = 3, QuizId = 1, Title = "Mix", DrawRule = DrawRule.DrillMix, Slug = "mix" },
        ]);

        var drills = await CreateService().GetDrillsByQuizId(1);

        Assert.Equal([3, 1, 2], drills.Select(d => d.Id));
    }

    [Fact]
    public async Task StartDrill_ReturnsNull_WhenDrillMissing()
    {
        _drills.Setup(r => r.GetDrillById(It.IsAny<int>())).ReturnsAsync((Drill?)null);

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.Null(result);
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartDrill_ReturnsNull_WhenDrillBelongsToDifferentQuiz()
    {
        _drills.Setup(r => r.GetDrillById(2))
            .ReturnsAsync(new Drill { Id = 2, QuizId = 99, IsAvailable = true });

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.Null(result);
    }

    [Fact]
    public async Task StartDrill_Throws_WhenUnavailable()
    {
        _drills.Setup(r => r.GetDrillById(2))
            .ReturnsAsync(new Drill { Id = 2, QuizId = 1, IsAvailable = false });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartDrill(1, 2, "u@e.com", null));
    }

    /// <summary>A Question in this Domain, ids derived from the Question id so they never collide.</summary>
    private static Question InDomain(int id, string domain = "Security and Compliance") =>
        Question(id, domain, correctIds: [id * 10], wrongIds: [id * 10 + 1]);

    private static Submission FinishedAttempt(int id, DateTime at, int[] served, int[] correct) =>
        new()
        {
            Id = id, QuizId = 1, UserId = 7, Finished = true, CreatedAt = at,
            ServedQuestionIds = served.ToList(),
            RecordedAnswers = served
                .Select(q => new RecordedAnswer { QuestionId = q, IsCorrect = correct.Contains(q) })
                .ToList()
        };

    [Fact]
    public async Task StartDrill_CreatesSubmission_AndReturnsOnlyMatchingDomainQuestions()
    {
        _drills.Setup(r => r.GetDrillById(2)).ReturnsAsync(new Drill
        {
            Id = 2, QuizId = 1, Title = "Security", Domain = "Security and Compliance",
            Slug = "sec", IsAvailable = true
        });
        var inDomain = Question(10, "Security and Compliance", correctIds: [1], wrongIds: [2]);
        var otherDomain = Question(11, "Cloud Concepts", correctIds: [3], wrongIds: [4]);
        _questions.Setup(r => r.GetQuestionsByQuizId(1))
            .ReturnsAsync(new List<Question> { inDomain, otherDomain });

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.NotNull(result);
        var question = Assert.Single(result!.Questions);
        Assert.Equal(10, question.Id); // only the matching-domain question is included
        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.QuizId == 1 && s.DrillId == 2 && s.Email == "u@e.com" &&
            s.ServedQuestionIds.SequenceEqual(new[] { 10 }))), Times.Once);
    }

    [Fact]
    public async Task StartDrill_ServesPtContent_AndPersistsLanguage_WhenPtBr()
    {
        _drills.Setup(r => r.GetDrillById(2)).ReturnsAsync(new Drill
        {
            Id = 2, QuizId = 1, Title = "Security", Domain = "D", Slug = "sec", IsAvailable = true
        });
        var question = Question(10, "D", correctIds: [1], wrongIds: [2]);
        question.Text = "What is IAM?";
        question.TextPt = "O que é IAM?";
        _questions.Setup(r => r.GetQuestionsByQuizId(1)).ReturnsAsync([question]);

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null, Language.PtBr);

        Assert.Equal("O que é IAM?", Assert.Single(result!.Questions).Text);
        _submissions.Verify(r => r.Create(It.Is<Submission>(s => s.Language == Language.PtBr)), Times.Once);
    }

    [Fact]
    public async Task StartDrill_DrawsToTheDrillMix_ForALoggedInUser()
    {
        // 20 missed, 20 Due (proved once, eleven months ago), 20 never served. The drill is
        // asserted by composition, not by Question identity — the Unseen pick is random.
        var bank = Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        var history = FinishedAttempt(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 40).ToArray(), correct: Enumerable.Range(21, 20).ToArray());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([history]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        var served = result!.Questions.Select(q => q.Id).ToList();
        Assert.Equal(15, served.Count);
        Assert.Equal(11, served.Count(id => id <= 20));           // Missed
        Assert.Equal(0, served.Count(id => id is > 20 and <= 40)); // Due, behind the Missed
        Assert.Equal(4, served.Count(id => id > 40));              // Unseen
    }

    [Fact]
    public async Task StartDrill_DrawsUniformlyAtRandom_ForAnAnonymousVisitor()
    {
        // No User, so no Outcomes to read: the drill is 15 of the bank and no history is fetched.
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.Equal(15, result!.Questions.Count);
        Assert.Equal(15, result.Questions.Select(q => q.Id).Distinct().Count());
        _submissions.Verify(r => r.GetFinishedByUserAndQuiz(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task StartDrill_ServesFifteenUnseen_ForAUserWithNoHistory()
    {
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal(15, result!.Questions.Count);
        Assert.Equal(15, result.Questions.Select(q => q.Id).Distinct().Count());
    }

    [Fact]
    public async Task StartDrill_DrawsFromTheMissesOfAFullQuizAttempt()
    {
        // The full Quiz is never adapted, but its misses land in the matching Domain's drill.
        var bank = Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        var fullQuiz = FinishedAttempt(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 20).ToArray(), correct: []);
        fullQuiz.DrillId = null;
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([fullQuiz]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal(11, result!.Questions.Count(q => q.Id <= 20));
    }

    [Fact]
    public async Task StartDrill_ReportsTheDrillComposition_ForALoggedInUser()
    {
        // The counts a User is shown before the first Question are the served set's Outcomes
        // going in — the same numbers the draw was made to (issue #53).
        var bank = Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        // 5 missed, 35 proved long ago and now Due, 20 unseen: 5 Missed + 6 Due + 4 Unseen.
        var history = FinishedAttempt(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 40).ToArray(), correct: Enumerable.Range(6, 35).ToArray());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([history]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.NotNull(result!.Composition);
        Assert.Equal(5, result.Composition!.Missed);
        Assert.Equal(6, result.Composition.Due);
        Assert.Equal(4, result.Composition.Unseen);
        Assert.Equal(0, result.Composition.Mastered);
    }

    [Fact]
    public async Task StartDrill_ReportsLastResortSeatsAsMastered_UntilTheClockMakesThemDue()
    {
        // The whole 20-Question bank was proved once at noon. Read an hour later nothing is Due,
        // so every seat is a last-resort Mastered one; read a day later every one is Due.
        var bank = Enumerable.Range(1, 20).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        var provedAt = new DateTime(2026, 11, 30, 12, 0, 0);
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, provedAt, served: Enumerable.Range(1, 20).ToArray(), correct: Enumerable.Range(1, 20).ToArray())]);

        var soon = await CreateService(provedAt.AddHours(1)).StartDrill(1, 2, null, 7);
        var later = await CreateService(provedAt.AddDays(1)).StartDrill(1, 2, null, 7);

        Assert.Equal(15, soon!.Composition!.Mastered);
        Assert.Equal(0, soon.Composition.Due);
        Assert.Equal(15, later!.Composition!.Due);
        Assert.Equal(0, later.Composition.Mastered);
    }

    [Fact]
    public async Task StartDrill_DrawsTheWholeQuizMix_AcrossDomains()
    {
        // The seeded Mix drill: Drill Mix with no Domain, so misses in either Domain seat.
        _drills.Setup(r => r.GetDrillById(3)).ReturnsAsync(new Drill
        {
            Id = 3, QuizId = 1, Title = "Mix", Domain = null,
            DrawRule = DrawRule.DrillMix, Slug = "mix", IsAvailable = true
        });
        var bank = Enumerable.Range(1, 30).Select(i => InDomain(i, "Security and Compliance"))
            .Concat(Enumerable.Range(31, 30).Select(i => InDomain(i, "Cloud Concepts")))
            .ToList();
        _questions.Setup(r => r.GetQuestionsByQuizId(1)).ReturnsAsync(bank);
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1, 2, 3, 31, 32, 33], correct: [])]);

        var result = await CreateService().StartDrill(1, 3, null, 7);
        var anonymous = await CreateService().StartDrill(1, 3, "u@e.com", null);

        Assert.Equal(15, result!.Questions.Count);
        Assert.Equal(6, result.Composition!.Missed);
        Assert.Equal(9, result.Composition.Unseen);
        Assert.Subset(result.Questions.Select(q => q.Id).ToHashSet(), new HashSet<int> { 1, 2, 3, 31, 32, 33 });
        Assert.Equal(15, anonymous!.Questions.Count);
        Assert.Null(anonymous.Composition);
    }

    [Fact]
    public async Task StartDrill_ReportsAllUnseen_ForAUserWithNoHistory()
    {
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal(15, result!.Composition!.Unseen);
        Assert.Equal(0, result.Composition.Missed);
        Assert.Equal(0, result.Composition.Due);
        Assert.Equal(0, result.Composition.Mastered);
    }

    [Fact]
    public async Task StartDrill_ReportsNoComposition_ForAnAnonymousVisitor()
    {
        // Nothing adaptive happened, so there is nothing to claim: the web app shows the
        // sign-in pitch in that slot instead.
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.Null(result!.Composition);
    }

    private void SetupDomainBank(List<Question> bank)
    {
        _drills.Setup(r => r.GetDrillById(2)).ReturnsAsync(new Drill
        {
            Id = 2, QuizId = 1, Title = "Security", Domain = "Security and Compliance",
            Slug = "sec", IsAvailable = true
        });
        _questions.Setup(r => r.GetQuestionsByQuizId(1)).ReturnsAsync(bank);
    }

    [Fact]
    public async Task CheckAnswer_ExplanationFollowsSubmissionLanguage_NotRequestHeader()
    {
        // Submission started in pt-BR; Check resolves from its stored Language — there is
        // deliberately no language parameter on Check (ADR 0004: no mid-attempt switch).
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com",
            ServedQuestionIds = [10], Language = Language.PtBr
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        var question = Question(10, "D", correctIds: [1], wrongIds: [2], explanation: "because AWS");
        question.ExplanationPt = "porque AWS";
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync([question]);

        var result = await CreateService().CheckAnswer(1, 2, 5, 10, [1]);

        Assert.Equal("porque AWS", result.Explanation);
    }

    [Fact]
    public async Task CheckAnswer_ExplanationFallsBackToEn_WhenPtMissing()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com",
            ServedQuestionIds = [10], Language = Language.PtBr
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        var question = Question(10, "D", correctIds: [1], wrongIds: [2], explanation: "because AWS");
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync([question]);

        var result = await CreateService().CheckAnswer(1, 2, 5, 10, [1]);

        Assert.Equal("because AWS", result.Explanation);
    }

    [Fact]
    public async Task CheckAnswer_CorrectSelection_ReturnsCorrectnessAndExplanation_AndRecordsAnswer()
    {
        var submission = new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com", ServedQuestionIds = [10] };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        var question = Question(10, "D", correctIds: [1], wrongIds: [2], explanation: "because AWS");
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 10 }))))
            .ReturnsAsync(new List<Question> { question });

        var result = await CreateService().CheckAnswer(1, 2, 5, 10, new List<int> { 1 });

        Assert.True(result.IsCorrect);
        Assert.Equal(new[] { 1 }, result.CorrectAnswerIds);
        Assert.Equal(new[] { 1 }, result.SelectedAnswerIds);
        Assert.Equal("because AWS", result.Explanation);
        // A Practice attempt collects no Confidence: a Check reveals correctness immediately (ADR 0006).
        _submissions.Verify(r => r.RecordAnswer(It.Is<RecordedAnswer>(ra =>
            ra.SubmissionId == 5 && ra.QuestionId == 10 && ra.SelectedAnswerIds.SequenceEqual(new[] { 1 })
            && ra.Confidence == null
            // The verdict shown at Check is the verdict stored (ADR 0007).
            && ra.IsCorrect == true)), Times.Once);
    }

    [Fact]
    public async Task CheckAnswer_MultipleResponse_PartialSelectionIsIncorrect_ButStillRecorded()
    {
        // multiple_response needs an exact match: both correct ids, no incorrect id. Picking only one is wrong.
        var submission = new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com", ServedQuestionIds = [10] };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        var question = Question(10, "D", correctIds: [1, 2], wrongIds: [3], type: QuestionType.MultipleResponse);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<Question> { question });

        var result = await CreateService().CheckAnswer(1, 2, 5, 10, new List<int> { 1 }); // only one of two correct

        Assert.False(result.IsCorrect);
        Assert.Equal(new[] { 1, 2 }, result.CorrectAnswerIds);
        _submissions.Verify(r => r.RecordAnswer(It.Is<RecordedAnswer>(ra =>
            ra.QuestionId == 10 && ra.IsCorrect == false)), Times.Once);
    }

    [Fact]
    public async Task CheckAnswer_Throws_WhenQuestionAlreadyChecked_AndDoesNotRecordAgain()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com", ServedQuestionIds = [10],
            RecordedAnswers = [Recorded(10, 1)] // already checked
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CheckAnswer(1, 2, 5, 10, new List<int> { 2 }));
        _submissions.Verify(r => r.RecordAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task CheckAnswer_Throws_WhenSubmissionBelongsToDifferentQuiz()
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 99, DrillId = 2, Mode = Mode.Practice });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CheckAnswer(1, 2, 5, 10, new List<int> { 1 }));
        _submissions.Verify(r => r.RecordAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task CheckAnswer_Throws_WhenSubmissionAlreadyFinished()
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = true });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CheckAnswer(1, 2, 5, 10, new List<int> { 1 }));
        _submissions.Verify(r => r.RecordAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task FinishDrill_Throws_WhenSubmissionDoesNotMatch()
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 99, DrillId = 2, Mode = Mode.Practice });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.FinishDrill(1, 2, 5));
    }

    [Fact]
    public async Task FinishDrill_FinishesTheLoadedSubmission_OnThePracticeRule_WhateverTheQuiz()
    {
        // SAA-C03 has an Exam Weighting, but Practice is graded by Mode, not by Quiz (ADR 0010).
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Email = "u@e.com",
            ServedQuestionIds = [10], RecordedAnswers = [Stamped(10, true, 1)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync([Question(10, "Design Secure Architectures", correctIds: [1], wrongIds: [2])]);

        var response = await CreateService().FinishDrill(1, 2, 5);

        Assert.Equal(100, response.ScaledScore);
        Assert.Equal(70, response.PassingScore);
        Assert.Empty(response.DomainBreakdown);
        Assert.True(submission.Finished);
        _submissions.Verify(r => r.GetById(5), Times.Once);
    }

    [Fact]
    public async Task FinishDrill_Throws_WhenQuizMissing()
    {
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync((Quiz?)null);
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice });

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService().FinishDrill(1, 2, 5));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task FinishDrill_Throws_WhenAlreadyFinished()
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = true });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.FinishDrill(1, 2, 5));
    }

    [Fact]
    public async Task StartDrill_StartsPractice_WithExactlyOneDrill()
    {
        // Start-path invariant, half of it: a drill start is always Practice and always carries
        // its Drill, so the combos ADR 0002 and ADR 0008 forbid stay unrepresentable (ADR 0010).
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());

        await CreateService().StartDrill(1, 2, "u@e.com", null);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.Mode == Mode.Practice && s.DrillId == 2 && s.DrawRule == DrawRule.DrillMix)), Times.Once);
    }

    [Fact]
    public async Task StartDrill_StampsTheDrawRuleOfTheDrillItStartedFrom()
    {
        SetupMistakesDrill();
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1], correct: [])]);

        await CreateService().StartDrill(1, 2, null, 7);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.DrawRule == DrawRule.Mistakes)), Times.Once);
    }

    /// <summary>The seeded Mistakes Drill: cross-Domain, and the bank it draws from.</summary>
    private void SetupMistakesDrill()
    {
        _drills.Setup(r => r.GetDrillById(2)).ReturnsAsync(new Drill
        {
            Id = 2, QuizId = 1, Title = "Mistakes", Domain = null,
            DrawRule = DrawRule.Mistakes, Slug = "mistakes", IsAvailable = true
        });
        var bank = Enumerable.Range(1, 30).Select(i => InDomain(i, "Security and Compliance"))
            .Concat(Enumerable.Range(31, 30).Select(i => InDomain(i, "Cloud Concepts")))
            .ToList();
        _questions.Setup(r => r.GetQuestionsByQuizId(1)).ReturnsAsync(bank);
    }

    [Fact]
    public async Task StartDrill_DrawsFromTheWholeParentQuiz_WhenDomainIsNull()
    {
        // A cross-Domain Drill has no Domain to filter on, so its scope is every Question the
        // parent Quiz owns — across Domains (ADR 0010). Missed in both Domains, so both seat.
        SetupMistakesDrill();
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1, 2, 31, 32], correct: [])]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal([1, 2, 31, 32], result!.Questions.Select(q => q.Id).Order());
        Assert.Null(result.Domain);
        Assert.Equal(DrawRule.Mistakes, result.DrawRule);
    }

    [Fact]
    public async Task StartDrill_ServesTheWholeUnion_EvenWhenItIsShorterThanFifteen()
    {
        // The one drill that may be short: two misses and a lucky guess is a three-Question
        // attempt, and the Submission is served that set (ADR 0011).
        SetupMistakesDrill();
        var exam = FinishedAttempt(2, new DateTime(2026, 2, 1), served: [40], correct: [40]);
        exam.DrillId = null;
        exam.Mode = Mode.Exam;
        exam.RecordedAnswers[0].Confidence = Confidence.Guess;
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1, 2], correct: []), exam]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal([1, 2, 40], result!.Questions.Select(q => q.Id).Order());
        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.ServedQuestionIds.Count == 3 && s.Mode == Mode.Practice && s.DrillId == 2)), Times.Once);
    }

    [Fact]
    public async Task StartDrill_ReportsNoComposition_ForMistakes()
    {
        // A per-seat line would be a lie on a single-bucket draw: the web shows a plain
        // count of what was seated instead (ADR 0011).
        SetupMistakesDrill();
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1, 2], correct: [])]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Null(result!.Composition);
    }

    [Fact]
    public async Task StartDrill_RefusesMistakes_ForAnAnonymousVisitor()
    {
        // Both halves of the union need a User, so signing in is the lock (ADR 0011).
        SetupMistakesDrill();

        var service = CreateService();

        var exception = await Assert.ThrowsAsync<MistakesNotStartableException>(
            () => service.StartDrill(1, 2, "u@e.com", null));
        Assert.Equal(MistakesGate.SignInRequired, exception.Gate);
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartDrill_RefusesMistakes_WhenThereIsNothingToReview()
    {
        // Empty means no misses and no low ratings — and empty does not start, rather than pad.
        SetupMistakesDrill();
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync(
            [FinishedAttempt(1, new DateTime(2026, 1, 1), served: [1, 2], correct: [1, 2])]);

        var service = CreateService();

        var exception = await Assert.ThrowsAsync<MistakesNotStartableException>(
            () => service.StartDrill(1, 2, null, 7));
        Assert.Equal(MistakesGate.NothingToReview, exception.Gate);
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task CheckAnswer_Throws_WhenSubmissionIsExam()
    {
        // Mode is the gate, not the presence of a Drill: an Exam attempt must never be told a
        // single Question's correctness (ADR 0002, ADR 0010).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Exam, ServedQuestionIds = [10]
        });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CheckAnswer(1, 2, 5, 10, [1]));
        _submissions.Verify(r => r.RecordAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task FinishDrill_Throws_WhenSubmissionIsExam()
    {
        // An Exam attempt must not be graded on the Practice 0-100 scale (ADR 0010).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Exam, ServedQuestionIds = [10]
        });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.FinishDrill(1, 2, 5));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }
}

using API.Entities;
using API.Model.Request;
using API.Repositories;
using API.Services;
using Moq;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

public class DrillServiceTests
{
    private readonly Mock<IDrillRepository> _drills = new();
    private readonly Mock<IQuestionRepository> _questions = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    private DrillService CreateService() =>
        new(_drills.Object, _questions.Object, _submissions.Object,
            new SubmissionGrader(_questions.Object, _submissions.Object));

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
        // 20 missed, 20 mastered, 20 never served. The drill is asserted by composition, not by
        // Question identity — the pick within each bucket is random (ADR 0008).
        var bank = Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        var history = FinishedAttempt(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 40).ToArray(), correct: Enumerable.Range(21, 20).ToArray());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([history]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        var served = result!.Questions.Select(q => q.Id).ToList();
        Assert.Equal(15, served.Count);
        Assert.Equal(9, served.Count(id => id <= 20));            // Missed
        Assert.Equal(2, served.Count(id => id is > 20 and <= 40)); // Mastered
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

        Assert.Equal(9, result!.Questions.Count(q => q.Id <= 20));
    }

    [Fact]
    public async Task StartDrill_ReportsTheDrillComposition_ForALoggedInUser()
    {
        // The counts a User is shown before the first Question are the served set's Outcomes
        // going in — the same numbers the draw was made to (issue #53).
        var bank = Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList();
        SetupDomainBank(bank);
        var history = FinishedAttempt(1, new DateTime(2026, 1, 1),
            served: Enumerable.Range(1, 40).ToArray(), correct: Enumerable.Range(21, 20).ToArray());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([history]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.NotNull(result!.Composition);
        Assert.Equal(9, result.Composition!.Missed);
        Assert.Equal(4, result.Composition.Unseen);
        Assert.Equal(2, result.Composition.Mastered);
    }

    [Fact]
    public async Task StartDrill_ReportsAllUnseen_ForAUserWithNoHistory()
    {
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());
        _submissions.Setup(r => r.GetFinishedByUserAndQuiz(7, 1)).ReturnsAsync([]);

        var result = await CreateService().StartDrill(1, 2, null, 7);

        Assert.Equal(15, result!.Composition!.Unseen);
        Assert.Equal(0, result.Composition.Missed);
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
    public async Task FinishDrill_Throws_WhenAlreadyFinished()
    {
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = true });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.FinishDrill(1, 2, 5));
    }

    [Fact]
    public async Task FinishDrill_GradesRecordedAnswers_ScoresAndPersistsFinishedSubmission()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = false, Email = "u@e.com",
            ServedQuestionIds = [10], RecordedAnswers = [Recorded(10, 1)] // checked correctly
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<Question> { Question(10, "D", correctIds: [1], wrongIds: [2]) });

        var response = await CreateService().FinishDrill(1, 2, 5);

        Assert.Equal(100, response.ScaledScore); // drill -> 0-100 percentage
        Assert.True(response.Passed);
        Assert.True(submission.Finished);
        Assert.Equal(100, submission.Score);
        _submissions.Verify(r => r.Update(It.Is<Submission>(s => s.Finished && s.Score == 100)), Times.Once);
    }

    [Theory]
    [InlineData(7, 70, true)]  // exactly at the pass threshold
    [InlineData(6, 60, false)] // just below
    public async Task FinishDrill_ScoresPercentage_AndPassesAtSeventy(int correctCount, int expectedScore, bool expectedPass)
    {
        var questions = Enumerable.Range(1, 10)
            .Select(i => Question(i, "D", correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToList();
        var recorded = questions
            .Select((q, idx) => Recorded(q.Id, idx < correctCount ? (idx + 1) * 10 : (idx + 1) * 10 + 1))
            .ToList();
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = false, Email = "u@e.com",
            ServedQuestionIds = questions.Select(q => q.Id).ToList(), RecordedAnswers = recorded
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(questions);

        var response = await CreateService().FinishDrill(1, 2, 5);

        Assert.Equal(expectedScore, response.ScaledScore);
        Assert.Equal(expectedPass, response.Passed);
    }

    [Fact]
    public async Task FinishDrill_GradesAgainstServedSet_UncheckedQuestionCountsAsWrong()
    {
        // Two questions served; only one was checked. The unchecked one stays in the denominator (ADR 0001).
        var submission = new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Mode = Mode.Practice, Finished = false, Email = "u@e.com",
            ServedQuestionIds = [10, 11], RecordedAnswers = [Recorded(10, 1)] // 11 never checked
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 10, 11 }))))
            .ReturnsAsync(new List<Question>
            {
                Question(10, "D", correctIds: [1], wrongIds: [2]),
                Question(11, "D", correctIds: [3], wrongIds: [4])
            });

        var response = await CreateService().FinishDrill(1, 2, 5);

        Assert.Equal(2, response.TotalQuestions); // served count, not checked count
        Assert.Equal(1, response.CorrectCount);
        Assert.Equal(50, response.ScaledScore);   // 1/2 -> 50%
        Assert.False(response.Passed);
    }

    [Fact]
    public async Task StartDrill_StartsPractice_WithExactlyOneDrill()
    {
        // Start-path invariant, half of it: a drill start is always Practice and always carries
        // its Drill, so the combos ADR 0002 and ADR 0008 forbid stay unrepresentable (ADR 0010).
        SetupDomainBank(Enumerable.Range(1, 60).Select(i => InDomain(i)).ToList());

        await CreateService().StartDrill(1, 2, "u@e.com", null);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.Mode == Mode.Practice && s.DrillId == 2)), Times.Once);
    }

    [Fact]
    public async Task StartDrill_DrawsFromTheWholeParentQuiz_WhenDomainIsNull()
    {
        // A cross-Domain Drill has no Domain to filter on, so its scope is every Question the
        // parent Quiz owns — across Domains (ADR 0010).
        _drills.Setup(r => r.GetDrillById(2)).ReturnsAsync(new Drill
        {
            Id = 2, QuizId = 1, Title = "Mistakes", Domain = null,
            DrawRule = DrawRule.Mistakes, Slug = "mistakes", IsAvailable = true
        });
        var bank = Enumerable.Range(1, 30).Select(i => InDomain(i, "Security and Compliance"))
            .Concat(Enumerable.Range(31, 30).Select(i => InDomain(i, "Cloud Concepts")))
            .ToList();
        _questions.Setup(r => r.GetQuestionsByQuizId(1)).ReturnsAsync(bank);

        var result = await CreateService().StartDrill(1, 2, "u@e.com", null);

        Assert.Equal(15, result!.Questions.Count);
        Assert.Null(result.Domain);
        Assert.Equal(DrawRule.Mistakes, result.DrawRule);
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

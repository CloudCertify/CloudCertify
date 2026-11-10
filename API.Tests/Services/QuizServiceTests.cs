using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

public class QuizServiceTests
{
    private readonly Mock<IQuizRepository> _quizzes = new();
    private readonly Mock<IQuestionRepository> _questions = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    public QuizServiceTests()
    {
        // Answer-commit judges correctness against the served Question (ADR 0007), so every
        // AnswerQuestion test needs the Question graph; individual tests override this.
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(
            (List<int> ids) => ids.Select(id => Question(id, "D", correctIds: [7], wrongIds: [8])).ToList());
    }

    private QuizService CreateService() =>
        new(_quizzes.Object, _questions.Object, _submissions.Object,
            new SubmissionGrader(_questions.Object, _submissions.Object),
            NullLogger<QuizService>.Instance);

    [Fact]
    public async Task GetQuizById_ReturnsNull_WhenQuizMissing()
    {
        _quizzes.Setup(r => r.GetQuizById(99)).ReturnsAsync((Quiz?)null);

        var result = await CreateService().GetQuizById(99);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetQuizById_ListsTheWholeQuizMixFirst()
    {
        // The Mix drill is seeded last on an existing catalog, so its Id is the highest; it is
        // still the main way to practice and leads the list (ADR 0013).
        var quiz = new Quiz
        {
            Id = 7, Title = "AWS CLF-C02", Slug = "CLF-C02", IsAvailable = true,
            Drills =
            [
                new Drill { Id = 1, QuizId = 7, Title = "Domain A", Domain = "A", DrawRule = DrawRule.DrillMix, Slug = "a" },
                new Drill { Id = 2, QuizId = 7, Title = "Mistakes", DrawRule = DrawRule.Mistakes, Slug = "m" },
                new Drill { Id = 3, QuizId = 7, Title = "Domain B", Domain = "B", DrawRule = DrawRule.DrillMix, Slug = "b" },
                new Drill { Id = 4, QuizId = 7, Title = "Mix", DrawRule = DrawRule.DrillMix, Slug = "mix" },
            ],
        };
        _quizzes.Setup(r => r.GetQuizById(7)).ReturnsAsync(quiz);

        var result = await CreateService().GetQuizById(7);

        Assert.Equal([4, 1, 2, 3], result!.Drills!.Select(d => d.Id));
    }

    [Fact]
    public async Task GetQuizById_MapsQuizToDto_WhenFound()
    {
        var quiz = new Quiz { Id = 7, Title = "AWS CLF-C02", Slug = "CLF-C02", IsAvailable = true };
        _quizzes.Setup(r => r.GetQuizById(7)).ReturnsAsync(quiz);

        var result = await CreateService().GetQuizById(7);

        Assert.NotNull(result);
        Assert.Equal(7, result!.Id);
        Assert.Equal("AWS CLF-C02", result.Title);
        Assert.Equal("CLF-C02", result.Slug);
    }

    [Fact]
    public async Task StartQuiz_ReturnsNull_WhenQuizMissing()
    {
        _quizzes.Setup(r => r.GetQuizById(It.IsAny<int>())).ReturnsAsync((Quiz?)null);

        var result = await CreateService().StartQuiz(1, "user@example.com", null);

        Assert.Null(result);
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartQuiz_Throws_WhenQuizUnavailable()
    {
        var quiz = new Quiz { Id = 1, IsAvailable = false };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartQuiz(1, "user@example.com", null));
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartQuiz_CreatesSubmission_AndReturnsDetail_WhenAvailable()
    {
        var quiz = new Quiz
        {
            Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true,
            Questions = new List<Question> { Question(100, "D", correctIds: [1], wrongIds: [2]) }
        };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var result = await CreateService().StartQuiz(1, "user@example.com", null);

        Assert.NotNull(result);
        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.QuizId == 1 && s.Email == "user@example.com" && !s.Finished &&
            s.ServedQuestionIds.SequenceEqual(new[] { 100 }))), Times.Once);
    }

    [Fact]
    public async Task StartQuiz_StartsExam_WithNoDrill()
    {
        // Start-path invariant, the other half: a full-Quiz start is always Exam and never
        // references a Drill, so an adaptive or immediate-feedback exam is unreachable (ADR 0010).
        var quiz = new Quiz
        {
            Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true,
            Questions = new List<Question> { Question(100, "D", correctIds: [1], wrongIds: [2]) }
        };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        await CreateService().StartQuiz(1, "user@example.com", null);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.Mode == Mode.Exam && s.DrillId == null && s.DrawRule == null)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenSubmissionIsPractice()
    {
        // Mode is the gate, not the absence of a Drill: a Practice Recorded Answer is committed
        // at Check and immutable, so it must not be revisable here (ADR 0002, ADR 0010).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Mode = Mode.Practice, ServedQuestionIds = [100]
        });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 100, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionIsPractice()
    {
        // A Practice attempt scores 0-100, so it must not fall through the Scaled Score path
        // just because it was addressed to the full-Quiz URL (ADR 0010).
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Mode = Mode.Practice, ServedQuestionIds = [100]
        });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartQuiz_OwnsSubmissionByUser_AndDropsEmail_WhenLoggedIn()
    {
        var quiz = new Quiz
        {
            Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true,
            Questions = new List<Question> { Question(100, "D", correctIds: [1], wrongIds: [2]) }
        };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        // A token-derived userId wins: any body email is ignored, not stored (ADR 0003).
        await CreateService().StartQuiz(1, "stale@client.com", userId: 42);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s =>
            s.UserId == 42 && s.Email == null)), Times.Once);
    }

    [Fact]
    public async Task StartQuiz_Throws_WhenNoEmailAndNoUser()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateService().StartQuiz(1, email: null, userId: null));
        _submissions.Verify(r => r.Create(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task StartQuiz_ServesFixedCount_WhenMinEqualsMax()
    {
        // A fixed exam (Min == Max == 2) must serve exactly that many, never the whole bank.
        var quiz = AvailableQuizWithQuestions(min: 2, max: 2, bankSize: 5);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var served = await CaptureServedCount();

        Assert.Equal(2, served);
    }

    [Fact]
    public async Task StartQuiz_ServesCountWithinRange_WhenRanged()
    {
        // A ranged quiz (2..4) must pick a count inside the inclusive bounds.
        var quiz = AvailableQuizWithQuestions(min: 2, max: 4, bankSize: 10);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var served = await CaptureServedCount();

        Assert.InRange(served, 2, 4);
    }

    [Fact]
    public async Task StartQuiz_ServesAllAvailable_WhenBankSmallerThanConfiguredCount()
    {
        // Bank holds 3 but the exam wants 5: serve all 3 instead of silently under-serving.
        var quiz = AvailableQuizWithQuestions(min: 5, max: 5, bankSize: 3);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var served = await CaptureServedCount();

        Assert.Equal(3, served);
    }

    private static Quiz AvailableQuizWithQuestions(int min, int max, int bankSize)
    {
        var bank = Enumerable.Range(1, bankSize)
            .Select(i => Question(i, "D", correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToList();
        return new Quiz
        {
            Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true,
            MinQuestions = min, MaxQuestions = max, Questions = bank
        };
    }

    private async Task<int> CaptureServedCount()
    {
        Submission? captured = null;
        _submissions.Setup(r => r.Create(It.IsAny<Submission>()))
            .Callback<Submission>(s => captured = s)
            .ReturnsAsync((Submission s) => s);

        await CreateService().StartQuiz(1, "user@example.com", null);

        Assert.NotNull(captured);
        return captured!.ServedQuestionIds.Count;
    }

    [Fact]
    public async Task StartQuiz_ServesPtContent_AndPersistsLanguage_WhenPtBr()
    {
        var question = Question(100, "D", correctIds: [1], wrongIds: [2]);
        question.Text = "What is EC2?";
        question.TextPt = "O que é EC2?";
        question.Answers.First().Text = "A server";
        question.Answers.First().TextPt = "Um servidor";
        var quiz = new Quiz { Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true, Questions = [question] };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var result = await CreateService().StartQuiz(1, "u@e.com", null, Language.PtBr);

        var served = Assert.Single(result!.Questions);
        Assert.Equal("O que é EC2?", served.Text);
        Assert.Contains(served.Answers, a => a.Text == "Um servidor");
        _submissions.Verify(r => r.Create(It.Is<Submission>(s => s.Language == Language.PtBr)), Times.Once);
    }

    [Fact]
    public async Task StartQuiz_FallsBackToEnPerField_WhenPtMissing()
    {
        var question = Question(100, "D", correctIds: [1], wrongIds: [2]);
        question.Text = "What is EC2?"; // no TextPt
        var quiz = new Quiz { Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true, Questions = [question] };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        var result = await CreateService().StartQuiz(1, "u@e.com", null, Language.PtBr);

        Assert.Equal("What is EC2?", Assert.Single(result!.Questions).Text);
    }

    [Fact]
    public async Task StartQuiz_DefaultsToEnUs_WhenNoLanguageGiven()
    {
        var quiz = new Quiz
        {
            Id = 1, Title = "Quiz", Slug = "q", IsAvailable = true,
            Questions = [Question(100, "D", correctIds: [1], wrongIds: [2])]
        };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);

        await CreateService().StartQuiz(1, "u@e.com", null);

        _submissions.Verify(r => r.Create(It.Is<Submission>(s => s.Language == Language.EnUs)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_CommitsRecordedAnswer_ToFullQuizSubmission()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100, 101]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a =>
            a.SubmissionId == 5 && a.QuestionId == 100 && a.SelectedAnswerIds.SequenceEqual(new[] { 7 }))), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_StampsCorrectness_WhenCommitted()
    {
        // Correctness is judged at commit time and stored, though nothing is returned (ADR 0007).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.IsCorrect == true)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_StampsIncorrect_WhenSelectionIsWrong()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [8]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.IsCorrect == false)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_ReStampsCorrectness_WhenAnswerIsRevised()
    {
        // Revising before Submit re-judges the answer that now stands (ADR 0006 + 0007).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100],
            RecordedAnswers = [Recorded(100, 8)]
        });
        var service = CreateService();

        await service.AnswerQuestion(1, 5, 100, [8]);
        await service.AnswerQuestion(1, 5, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.IsCorrect == false)), Times.Once);
        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.IsCorrect == true)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_OverwritesPreviousAnswer_WhenReAnswered()
    {
        // The Navigator allows returning to a Question: the later commit wins (ADR 0006).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100],
            RecordedAnswers = [Recorded(100, 7)]
        });
        var service = CreateService();

        await service.AnswerQuestion(1, 5, 100, [8]);

        // Persistence upserts on (SubmissionId, QuestionId), so no immutability guard here.
        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a =>
            a.QuestionId == 100 && a.SelectedAnswerIds.SequenceEqual(new[] { 8 }))), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_PersistsConfidence_WhenRated()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [7], Confidence.Guess);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a =>
            a.QuestionId == 100 && a.Confidence == Confidence.Guess)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_PersistsNoConfidence_WhenUnrated()
    {
        // Rating is optional: an unrated answer stores no Confidence at all (ADR 0006).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.Confidence == null)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_ReRates_WhenAnswerChanges()
    {
        // Changing the answer re-rates it; the latest rating wins.
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100],
            RecordedAnswers = [Recorded(100, 7)]
        });
        var service = CreateService();

        await service.AnswerQuestion(1, 5, 100, [8], Confidence.Confident);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a =>
            a.SelectedAnswerIds.SequenceEqual(new[] { 8 }) && a.Confidence == Confidence.Confident)), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenQuestionWasNotServed()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100]
        });
        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 999, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenSubmissionIsDrillAttempt()
    {
        // A Drill Check is final: it must not be re-answered through the full-quiz path (ADR 0002).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, DrillId = 2, Email = "u@e.com", ServedQuestionIds = [100]
        });
        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 100, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenSubmissionAlreadyFinished()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100], Finished = true, Score = 720
        });
        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 100, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenSubmissionMissing()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync((Submission?)null);
        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 100, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task AnswerQuestion_CommitsForLoggedInAttempt_TheSameWayAsAnonymous()
    {
        _submissions.Setup(r => r.GetById(6)).ReturnsAsync(new Submission
        {
            Id = 6, QuizId = 1, UserId = 42, Mode = Mode.Exam, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 6, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.SubmissionId == 6)), Times.Once);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionMissing()
    {
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync((Submission?)null);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionBelongsToDifferentQuiz()
    {
        // Submission was started for quiz 2 but is being submitted to quiz 1: reject, don't grade.
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 2, Email = "u@e.com" });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionBelongsToDrill()
    {
        // A drill submission must not be replayable through the full-quiz path (DrillId mismatch).
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, DrillId = 2, Email = "u@e.com" });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_AndDoesNotOverwriteScore_WhenAlreadyFinished()
    {
        // Replay of a finished full-quiz attempt must be rejected without re-grading (issue #12).
        var finished = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Finished = true, Score = 720,
            RecordedAnswers = [Recorded(100, 1)]
        };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(finished);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
        Assert.Equal(720, finished.Score); // original score untouched
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
        _questions.Verify(r => r.GetQuestionsByIds(It.IsAny<List<int>>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenQuizMissing()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission { Id = 5, QuizId = 1, Email = "u@e.com" });
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync((Quiz?)null);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SubmitQuiz(1, 5));
    }

    [Fact]
    public async Task SubmitQuiz_FinishesTheLoadedSubmission_OnItsQuizsExamWeighting()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Mode = Mode.Exam, ServedQuestionIds = [100],
            RecordedAnswers = [Stamped(100, true, 1)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync([Question(100, "Design Secure Architectures", correctIds: [1], wrongIds: [2])]);

        var response = await CreateService().SubmitQuiz(1, 5);

        Assert.Equal(720, response.PassingScore); // SAA-C03's published pass mark, not the flat 700
        Assert.Single(response.DomainBreakdown);
        Assert.True(submission.Finished);
        _submissions.Verify(r => r.GetById(5), Times.Once);
    }
}

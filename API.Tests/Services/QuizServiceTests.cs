using API.Entities;
using API.Model.Request;
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

    private QuizService CreateService() =>
        new(_quizzes.Object, _submissions.Object,
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
    public async Task SubmitQuiz_ResultContentFollowsSubmissionLanguage()
    {
        // The Submission was started in pt-BR; results resolve from its stored Language.
        var question = Question(100, "D", correctIds: [1], wrongIds: [2], explanation: "because AWS");
        question.Text = "What is EC2?";
        question.TextPt = "O que é EC2?";
        question.ExplanationPt = "porque AWS";
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100], Language = Language.PtBr
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync([question]);

        var response = await CreateService().SubmitQuiz(1, 5, [Answer(100, 1)]);

        var resultQuestion = Assert.Single(response.Questions);
        Assert.Equal("O que é EC2?", resultQuestion.Text);
        Assert.Equal("porque AWS", resultQuestion.Explanation);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionMissing()
    {
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync((Submission?)null);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitQuiz(1, 5, new List<QuizAnswer>()));
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionBelongsToDifferentQuiz()
    {
        // Submission was started for quiz 2 but is being submitted to quiz 1: reject, don't grade.
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 2, Email = "u@e.com" });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitQuiz(1, 5, new List<QuizAnswer>()));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_WhenSubmissionBelongsToSubquiz()
    {
        // A subquiz submission must not be replayable through the full-quiz path (SubquizId mismatch).
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, SubquizId = 2, Email = "u@e.com" });

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitQuiz(1, 5, new List<QuizAnswer>()));
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
    }

    [Fact]
    public async Task SubmitQuiz_Throws_AndDoesNotOverwriteScore_WhenAlreadyFinished()
    {
        // Replay of a finished full-quiz attempt must be rejected without re-grading (issue #12).
        var finished = new Submission { Id = 5, QuizId = 1, Email = "u@e.com", Finished = true, Score = 720 };
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(finished);

        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitQuiz(1, 5, new List<QuizAnswer> { Answer(100, 1) }));
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

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.SubmitQuiz(1, 5, new List<QuizAnswer>()));
    }

    [Fact]
    public async Task SubmitQuiz_GradesScoresAndPersistsFinishedSubmission()
    {
        var submission = new Submission { Id = 5, QuizId = 1, Email = "u@e.com", Finished = false, ServedQuestionIds = [100] };
        var quiz = new Quiz { Id = 1, Slug = "XYZ-C99" }; // unknown slug -> default strategy
        var question = Question(100, "D", correctIds: [1], wrongIds: [2]);

        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<Question> { question });

        var answers = new List<QuizAnswer> { Answer(100, 1) }; // fully correct

        var response = await CreateService().SubmitQuiz(1, 5, answers);

        Assert.Equal(1000, response.ScaledScore); // default strategy, 100% correct
        Assert.True(response.Passed);
        Assert.Equal(1, response.CorrectCount);
        Assert.True(submission.Finished);
        Assert.Equal(1000, submission.Score);
        _submissions.Verify(r => r.Update(It.Is<Submission>(s => s.Finished && s.Score == 1000)), Times.Once);
    }

    [Fact]
    public async Task SubmitQuiz_GradesAgainstServedSet_SkippedQuestionCountsAsWrong()
    {
        // Two questions served; the client answers only one, omitting the other entirely.
        var submission = new Submission { Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101] };
        var quiz = new Quiz { Id = 1, Slug = "XYZ-C99" }; // default strategy: 0-1000 scaled
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 100, 101 }))))
            .ReturnsAsync(new List<Question>
            {
                Question(100, "D", correctIds: [1], wrongIds: [2]),
                Question(101, "D", correctIds: [3], wrongIds: [4])
            });

        var answers = new List<QuizAnswer> { Answer(100, 1) }; // only the first, correct; 101 skipped

        var response = await CreateService().SubmitQuiz(1, 5, answers);

        // Denominator is the served count (2), not the answered count (1). Skipped 101 is wrong.
        Assert.Equal(2, response.TotalQuestions);
        Assert.Equal(1, response.CorrectCount);
        Assert.Equal(550, response.ScaledScore); // round(100 + 0.5 * 900)
        // Grading queried the served set, not the client-submitted ids.
        _questions.Verify(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 100, 101 }))), Times.Once);
    }

    [Fact]
    public async Task SubmitQuiz_ClientCannotInflateScore_ByOmittingAnswers()
    {
        // A served question the client is unsure about: omitting it must not beat answering it wrong.
        var served = new List<Question>
        {
            Question(100, "D", correctIds: [1], wrongIds: [2]),
            Question(101, "D", correctIds: [3], wrongIds: [4])
        };
        var quiz = new Quiz { Id = 1, Slug = "XYZ-C99" };

        async Task<int> ScoreFor(List<QuizAnswer> answers)
        {
            var submission = new Submission { Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101] };
            _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
            _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
            _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(served);
            return (await CreateService().SubmitQuiz(1, 5, answers)).ScaledScore;
        }

        var omitted = await ScoreFor([Answer(100, 1)]);                       // 101 left out
        var answeredWrong = await ScoreFor([Answer(100, 1), Answer(101, 4)]); // 101 answered incorrectly

        Assert.Equal(answeredWrong, omitted); // omission buys nothing
    }
}

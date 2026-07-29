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
    public async Task AnswerQuestion_CommitsRecordedAnswer_ToFullQuizSubmission()
    {
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101]
        });

        await CreateService().AnswerQuestion(1, 5, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a =>
            a.SubmissionId == 5 && a.QuestionId == 100 && a.SelectedAnswerIds.SequenceEqual(new[] { 7 }))), Times.Once);
    }

    [Fact]
    public async Task AnswerQuestion_OverwritesPreviousAnswer_WhenReAnswered()
    {
        // The Navigator allows returning to a Question: the later commit wins (ADR 0006).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100],
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100]
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100]
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100],
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100]
        });
        var service = CreateService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AnswerQuestion(1, 5, 999, [7]));
        _submissions.Verify(r => r.SaveAnswer(It.IsAny<RecordedAnswer>()), Times.Never);
    }

    [Fact]
    public async Task AnswerQuestion_Throws_WhenSubmissionIsSubquizAttempt()
    {
        // A Subquiz Check is final: it must not be re-answered through the full-quiz path (ADR 0002).
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
        {
            Id = 5, QuizId = 1, SubquizId = 2, Email = "u@e.com", ServedQuestionIds = [100]
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100], Finished = true, Score = 720
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
            Id = 6, QuizId = 1, UserId = 42, ServedQuestionIds = [100]
        });

        await CreateService().AnswerQuestion(1, 6, 100, [7]);

        _submissions.Verify(r => r.SaveAnswer(It.Is<RecordedAnswer>(a => a.SubmissionId == 6)), Times.Once);
    }

    [Fact]
    public async Task SubmitQuiz_GradesRecordedAnswers_IdenticallyToTheAnswersCommitted()
    {
        // An attempt answered identically scores the same as before the commit-as-you-go change.
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101],
            RecordedAnswers = [Recorded(100, 1), Recorded(101, 3)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(new List<Question>
        {
            Question(100, "D", correctIds: [1], wrongIds: [2]),
            Question(101, "D", correctIds: [3], wrongIds: [4])
        });

        var response = await CreateService().SubmitQuiz(1, 5);

        Assert.Equal(2, response.CorrectCount);
        Assert.Equal(1000, response.ScaledScore);
    }

    [Fact]
    public async Task SubmitQuiz_ScoresIdentically_WhateverTheConfidence()
    {
        // Self-reported data is never score-bearing: two attempts answered the same but rated
        // oppositely (or not at all) must produce the same score and pass/fail (ADR 0006).
        async Task<SubmitQuizResponseDto> Grade(Confidence?[] confidences)
        {
            var submissions = new Mock<ISubmissionRepository>();
            var questions = new Mock<IQuestionRepository>();
            var quizzes = new Mock<IQuizRepository>();
            submissions.Setup(r => r.GetById(5)).ReturnsAsync(new Submission
            {
                Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101],
                RecordedAnswers =
                [
                    Rated(Recorded(100, 1), confidences[0]),
                    Rated(Recorded(101, 4), confidences[1])
                ]
            });
            quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
            questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(new List<Question>
            {
                Question(100, "D", correctIds: [1], wrongIds: [2]),
                Question(101, "D", correctIds: [3], wrongIds: [4])
            });

            return await new QuizService(quizzes.Object, submissions.Object,
                new SubmissionGrader(questions.Object, submissions.Object),
                NullLogger<QuizService>.Instance).SubmitQuiz(1, 5);
        }

        var unrated = await Grade([null, null]);
        var confident = await Grade([Confidence.Confident, Confidence.Confident]);
        var guessed = await Grade([Confidence.Guess, Confidence.Guess]);

        Assert.Equal(unrated.ScaledScore, confident.ScaledScore);
        Assert.Equal(unrated.ScaledScore, guessed.ScaledScore);
        Assert.Equal(unrated.Passed, confident.Passed);
        Assert.Equal(unrated.CorrectCount, guessed.CorrectCount);
        Assert.Equal(
            unrated.DomainBreakdown.Select(d => (d.Domain, d.Correct, d.Total)),
            guessed.DomainBreakdown.Select(d => (d.Domain, d.Correct, d.Total)));
    }

    private static RecordedAnswer Rated(RecordedAnswer answer, Confidence? confidence)
    {
        answer.Confidence = confidence;
        return answer;
    }

    [Fact]
    public async Task SubmitQuiz_CountsLuckyGuessesAndMisconceptions_FromRecordedAnswers()
    {
        // 100: guessed and right (lucky guess). 101: sure and wrong (misconception).
        // 102: guessed and wrong, 103: unrated — neither is either count (ADR 0006).
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101, 102, 103],
            RecordedAnswers =
            [
                Rated(Recorded(100, 1), Confidence.Guess),
                Rated(Recorded(101, 4), Confidence.Confident),
                Rated(Recorded(102, 6), Confidence.Guess),
                Rated(Recorded(103, 7), null)
            ]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(new List<Question>
        {
            Question(100, "D", correctIds: [1], wrongIds: [2]),
            Question(101, "D", correctIds: [3], wrongIds: [4]),
            Question(102, "D", correctIds: [5], wrongIds: [6]),
            Question(103, "D", correctIds: [7], wrongIds: [8])
        });

        var response = await CreateService().SubmitQuiz(1, 5);

        Assert.Equal(1, response.LuckyGuessCount);
        Assert.Equal(1, response.MisconceptionCount);
    }

    [Fact]
    public async Task SubmitQuiz_ReportsNoConfidence_WhenNothingWasRated()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100],
            RecordedAnswers = [Recorded(100, 1)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync([Question(100, "D", correctIds: [1], wrongIds: [2])]);

        var response = await CreateService().SubmitQuiz(1, 5);

        Assert.Equal(0, response.LuckyGuessCount);
        Assert.Equal(0, response.MisconceptionCount);
        Assert.Null(Assert.Single(response.Questions).Confidence);
    }

    [Fact]
    public async Task SubmitQuiz_CarriesConfidenceIntoReview_PerQuestion()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101],
            RecordedAnswers = [Rated(Recorded(100, 1), Confidence.Unsure), Recorded(101, 3)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(new List<Question>
        {
            Question(100, "D", correctIds: [1], wrongIds: [2]),
            Question(101, "D", correctIds: [3], wrongIds: [4])
        });

        var response = await CreateService().SubmitQuiz(1, 5);

        Assert.Equal(Confidence.Unsure, response.Questions.Single(q => q.Id == 100).Confidence);
        Assert.Null(response.Questions.Single(q => q.Id == 101).Confidence);
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
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100], Language = Language.PtBr,
            RecordedAnswers = [Recorded(100, 1)]
        };
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "XYZ-C99" });
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync([question]);

        var response = await CreateService().SubmitQuiz(1, 5);

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
    public async Task SubmitQuiz_Throws_WhenSubmissionBelongsToSubquiz()
    {
        // A subquiz submission must not be replayable through the full-quiz path (SubquizId mismatch).
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(new Quiz { Id = 1, Slug = "SAA-C03" });
        _submissions.Setup(r => r.GetById(5))
            .ReturnsAsync(new Submission { Id = 5, QuizId = 1, SubquizId = 2, Email = "u@e.com" });

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
    public async Task SubmitQuiz_GradesScoresAndPersistsFinishedSubmission()
    {
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", Finished = false, ServedQuestionIds = [100],
            RecordedAnswers = [Recorded(100, 1)] // committed during the attempt, fully correct
        };
        var quiz = new Quiz { Id = 1, Slug = "XYZ-C99" }; // unknown slug -> default strategy
        var question = Question(100, "D", correctIds: [1], wrongIds: [2]);

        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>()))
            .ReturnsAsync(new List<Question> { question });

        var response = await CreateService().SubmitQuiz(1, 5);

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
        // Two questions served; the visitor answered only one, leaving the other unanswered.
        var submission = new Submission
        {
            Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101],
            RecordedAnswers = [Recorded(100, 1)] // only the first, correct; 101 never answered
        };
        var quiz = new Quiz { Id = 1, Slug = "XYZ-C99" }; // default strategy: 0-1000 scaled
        _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
        _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
        _questions.Setup(r => r.GetQuestionsByIds(It.Is<List<int>>(ids => ids.SequenceEqual(new[] { 100, 101 }))))
            .ReturnsAsync(new List<Question>
            {
                Question(100, "D", correctIds: [1], wrongIds: [2]),
                Question(101, "D", correctIds: [3], wrongIds: [4])
            });

        var response = await CreateService().SubmitQuiz(1, 5);

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

        async Task<int> ScoreFor(List<RecordedAnswer> recorded)
        {
            var submission = new Submission
            {
                Id = 5, QuizId = 1, Email = "u@e.com", ServedQuestionIds = [100, 101],
                RecordedAnswers = recorded
            };
            _submissions.Setup(r => r.GetById(5)).ReturnsAsync(submission);
            _quizzes.Setup(r => r.GetQuizById(1)).ReturnsAsync(quiz);
            _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(served);
            return (await CreateService().SubmitQuiz(1, 5)).ScaledScore;
        }

        var omitted = await ScoreFor([Recorded(100, 1)]);                        // 101 never answered
        var answeredWrong = await ScoreFor([Recorded(100, 1), Recorded(101, 4)]); // 101 answered incorrectly

        Assert.Equal(answeredWrong, omitted); // leaving a question unanswered buys nothing
    }
}

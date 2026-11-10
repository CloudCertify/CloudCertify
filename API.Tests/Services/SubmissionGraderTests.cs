using API.Entities;
using API.Model.Response;
using API.Repositories;
using API.Services;
using API.Services.Grading;
using Moq;
using static API.Tests.QuizBuilder;

namespace API.Tests.Services;

/// <summary>
/// The Exam and Practice finish paths both hand <see cref="SubmissionGrader"/> one loaded
/// Submission, so correctness (the stamp on each Recorded Answer, ADR 0007), the scoring rule,
/// and the lifecycle guards are proven once here.
/// </summary>
public class SubmissionGraderTests
{
    private readonly Mock<IQuestionRepository> _questions = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    private static readonly Quiz Uncataloged = new() { Id = 1, Slug = "XYZ-C99" };

    private SubmissionGrader CreateGrader() => new(_questions.Object, _submissions.Object);

    private void Serve(params Question[] questions) =>
        _questions.Setup(r => r.GetQuestionsByIds(It.IsAny<List<int>>())).ReturnsAsync(questions.ToList());

    private static Submission Exam(params RecordedAnswer[] recorded) => new()
    {
        Id = 5, QuizId = 1, Mode = Mode.Exam, Email = "u@e.com",
        ServedQuestionIds = recorded.Select(r => r.QuestionId).ToList(),
        RecordedAnswers = recorded.ToList(),
    };

    [Fact]
    public async Task Finish_CountsTheStampedVerdict_WhenTheKeyChangedMidAttempt()
    {
        // 100 was stamped right, then its key moved to answer 2; 101 the reverse.
        Serve(Question(100, "D", correctIds: [2], wrongIds: [1]),
              Question(101, "D", correctIds: [3], wrongIds: [4]));
        var submission = Exam(Stamped(100, true, 1), Stamped(101, false, 3));

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(1, response.CorrectCount);
        Assert.Equal([true, false], response.Questions.Select(q => q.IsCorrect));
    }

    [Fact]
    public async Task Finish_CountsAnUnansweredServedQuestion_AsWrong()
    {
        Serve(Question(100, "D", correctIds: [1], wrongIds: [2]),
              Question(101, "D", correctIds: [3], wrongIds: [4]));
        var submission = Exam(Stamped(100, true, 1));
        submission.ServedQuestionIds = [100, 101];

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(1, response.CorrectCount);
        Assert.Equal(2, response.TotalQuestions);
        Assert.False(response.Questions.Single(q => q.Id == 101).IsCorrect);
    }

    [Fact]
    public async Task Finish_CountsANullStamp_AsWrong_EvenWhenTheSelectionMatchesTheKey()
    {
        Serve(Question(100, "D", correctIds: [1], wrongIds: [2]));

        var response = await CreateGrader().Finish(Exam(Recorded(100, 1)), Uncataloged, Mode.Exam);

        Assert.Equal(0, response.CorrectCount);
        Assert.False(Assert.Single(response.Questions).IsCorrect);
    }

    [Fact]
    public async Task Finish_CountsLuckyGuessesAndMisconceptions_FromTheStamp()
    {
        // Every key disagrees with its stamp, so counting off the key would invert both counts.
        Serve(Question(100, "D", correctIds: [2], wrongIds: [1]),
              Question(101, "D", correctIds: [3], wrongIds: [4]),
              Question(102, "D", correctIds: [6], wrongIds: [5]));
        var submission = Exam(
            Rated(Stamped(100, true, 1), Confidence.Guess),      // lucky guess
            Rated(Stamped(101, false, 3), Confidence.Confident), // misconception
            Rated(Stamped(102, true, 5), Confidence.Confident)); // neither

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(1, response.LuckyGuessCount);
        Assert.Equal(1, response.MisconceptionCount);
    }

    [Fact]
    public async Task Finish_ScoresIdentically_WhateverTheConfidence()
    {
        // Self-reported data is never score-bearing (ADR 0006).
        async Task<SubmitQuizResponseDto> FinishRated(Confidence? rating)
        {
            Serve(Question(100, "D", correctIds: [1], wrongIds: [2]), Question(101, "D", correctIds: [3], wrongIds: [4]));
            var submission = Exam(Stamped(100, true, 1), Stamped(101, false, 4));
            submission.RecordedAnswers.ForEach(r => r.Confidence = rating);
            return await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);
        }

        foreach (var rating in new Confidence?[] { null, Confidence.Confident, Confidence.Guess })
        {
            var response = await FinishRated(rating);
            Assert.Equal((550, false, 1), (response.ScaledScore, response.Passed, response.CorrectCount));
        }
    }

    [Fact]
    public async Task Finish_CarriesEachQuestionsConfidence_IntoReview()
    {
        Serve(Question(100, "D", correctIds: [1], wrongIds: [2]), Question(101, "D", correctIds: [3], wrongIds: [4]));
        var submission = Exam(Rated(Stamped(100, true, 1), Confidence.Unsure), Stamped(101, true, 3));

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(Confidence.Unsure, response.Questions.Single(q => q.Id == 100).Confidence);
        Assert.Null(response.Questions.Single(q => q.Id == 101).Confidence);
        Assert.Equal(0, response.LuckyGuessCount + response.MisconceptionCount); // unrated counts as neither
    }

    [Fact]
    public async Task Finish_ResultContentFollowsTheSubmissionsLanguage()
    {
        // Started in pt-BR; results resolve from the stored Language, never a header (ADR 0004).
        var question = Question(100, "D", correctIds: [1], wrongIds: [2], explanation: "because AWS");
        question.Text = "What is EC2?";
        question.TextPt = "O que é EC2?";
        question.ExplanationPt = "porque AWS";
        Serve(question);
        var submission = Exam(Stamped(100, true, 1));
        submission.Language = Language.PtBr;

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        var result = Assert.Single(response.Questions);
        Assert.Equal("O que é EC2?", result.Text);
        Assert.Equal("porque AWS", result.Explanation);
        Assert.True(Assert.Single(result.Answers, a => a.Id == 1).WasSelected);
    }

    [Theory]
    [InlineData(10, 7, 70, true)]  // the pass mark itself passes
    [InlineData(3, 2, 67, false)]  // rounded percentage
    [InlineData(2, 2, 100, true)]  // plain percentage, never scaled
    [InlineData(0, 0, 0, false)]   // nothing served: no divide by zero
    public async Task Finish_ScoresPractice_AsAPercentage_PassingAtSeventy(
        int served, int correct, int expectedScore, bool expectedPass)
    {
        var submission = Practice(served, correct);

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Practice, drillId: 2);

        Assert.Equal(expectedScore, response.ScaledScore);
        Assert.Equal(expectedPass, response.Passed);
        Assert.Equal(70, response.PassingScore);
        Assert.Empty(response.DomainBreakdown);
    }

    [Theory]
    [InlineData(2, 2, 1000, true)]
    [InlineData(2, 1, 550, false)] // 100 + 0.5 * 900, under 700
    [InlineData(2, 0, 100, false)]
    [InlineData(0, 0, 100, false)] // nothing served: the floor, no divide by zero
    public async Task Finish_ScoresAnUncatalogedExam_OnTheFlat100To1000Band(
        int served, int correct, int expectedScore, bool expectedPass)
    {
        var submission = Practice(served, correct);
        submission.Mode = Mode.Exam;
        submission.DrillId = null;

        var response = await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(expectedScore, response.ScaledScore);
        Assert.Equal(expectedPass, response.Passed);
        Assert.Equal(700, response.PassingScore);
    }

    [Fact]
    public async Task Finish_ScoresACatalogedExam_ByDomainWeight_NotRawPercentage()
    {
        // 1 of 4 right, but it is the 12% Billing Domain: 100 + 0.12 * 900 = 208, not 325.
        Serve(Question(1, "Cloud Concepts", correctIds: [10], wrongIds: [11]),
              Question(2, "Security and Compliance", correctIds: [20], wrongIds: [21]),
              Question(3, "Cloud Technology and Services", correctIds: [30], wrongIds: [31]),
              Question(4, "Billing, Pricing, and Support", correctIds: [40], wrongIds: [41]));
        var submission = Exam(Stamped(1, false, 11), Stamped(2, false, 21), Stamped(3, false, 31), Stamped(4, true, 40));

        var response = await CreateGrader().Finish(submission, new Quiz { Id = 1, Slug = "CLF-C02" }, Mode.Exam);

        Assert.Equal(208, response.ScaledScore);
        Assert.False(response.Passed);
        Assert.Equal(700, response.PassingScore);
        Assert.Equal(1, response.CorrectCount);
    }

    [Fact]
    public async Task Finish_BreaksACatalogedExamDown_ByTheStampedVerdicts()
    {
        Serve(Question(1, "Security and Compliance", correctIds: [10], wrongIds: [11]),
              Question(2, "Security and Compliance", correctIds: [20], wrongIds: [21]),
              Question(3, "Not In The Guide", correctIds: [30], wrongIds: [31]));
        var submission = Exam(Stamped(1, true, 11), Stamped(2, false, 20), Stamped(3, true, 30));

        var response = await CreateGrader().Finish(submission, new Quiz { Id = 1, Slug = "CLF-C02" }, Mode.Exam);

        // An unweighted Domain still counts in the raw tally but adds no weight or breakdown row.
        Assert.Equal(2, response.CorrectCount);
        var security = Assert.Single(response.DomainBreakdown);
        Assert.Equal(new DomainResult("Security and Compliance", 1, 2, 0.30), security);
        Assert.Equal(235, response.ScaledScore); // 100 + 1/2 * 0.30 * 900
    }

    [Fact]
    public async Task Finish_StoresTheScore_AndMarksTheSubmissionFinished()
    {
        Serve(Question(100, "D", correctIds: [1], wrongIds: [2]));
        var submission = Exam(Stamped(100, true, 1));

        await CreateGrader().Finish(submission, Uncataloged, Mode.Exam);

        Assert.Equal(1000, submission.Score);
        Assert.True(submission.Finished);
        _submissions.Verify(r => r.Update(It.Is<Submission>(s => s.Finished && s.Score == 1000)), Times.Once);
    }

    [Theory]
    [InlineData(99, null, null)] // Exam addressed to another Quiz
    [InlineData(1, 3, null)]     // Exam addressed to a Drill
    [InlineData(1, null, 2)]     // Practice addressed without its Drill
    [InlineData(1, 3, 2)]        // Practice addressed to another Drill
    public async Task Finish_RejectsAWrongPath_WithoutGrading(int quizId, int? addressedDrillId, int? actualDrillId)
    {
        var submission = new Submission { Id = 5, QuizId = 1, DrillId = actualDrillId, Mode = Mode.Exam };
        var quiz = new Quiz { Id = quizId, Slug = "XYZ-C99" };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().Finish(submission, quiz, Mode.Exam, addressedDrillId));

        AssertNotGraded();
    }

    [Theory]
    [InlineData(Mode.Exam, Mode.Practice)]
    [InlineData(Mode.Practice, Mode.Exam)]
    public async Task Finish_RejectsAModeMismatch_WithoutGrading(Mode actual, Mode addressed)
    {
        var submission = new Submission { Id = 5, QuizId = 1, Mode = actual };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().Finish(submission, Uncataloged, addressed));

        AssertNotGraded();
    }

    [Theory]
    [InlineData(Mode.Exam, null)]
    [InlineData(Mode.Practice, 2)]
    public async Task Finish_RejectsAFinishedSubmission_AndKeepsItsScore(Mode mode, int? drillId)
    {
        var finished = new Submission { Id = 5, QuizId = 1, DrillId = drillId, Mode = mode, Finished = true, Score = 88 };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateGrader().Finish(finished, Uncataloged, mode, drillId));

        Assert.Equal(88, finished.Score);
        AssertNotGraded();
    }

    /// <summary>A Practice Submission on Drill 2 serving <paramref name="served"/> Questions, the first <paramref name="correct"/> stamped right.</summary>
    private Submission Practice(int served, int correct)
    {
        var questions = Enumerable.Range(1, served)
            .Select(i => Question(i, "D", correctIds: [i * 10], wrongIds: [i * 10 + 1]))
            .ToArray();
        Serve(questions);
        var submission = Exam(questions.Select((q, i) => Stamped(q.Id, i < correct, q.Id * 10)).ToArray());
        submission.Mode = Mode.Practice;
        submission.DrillId = 2;
        return submission;
    }

    private static RecordedAnswer Rated(RecordedAnswer answer, Confidence confidence)
    {
        answer.Confidence = confidence;
        return answer;
    }

    private void AssertNotGraded()
    {
        _submissions.Verify(r => r.Update(It.IsAny<Submission>()), Times.Never);
        _questions.Verify(r => r.GetQuestionsByIds(It.IsAny<List<int>>()), Times.Never);
    }
}

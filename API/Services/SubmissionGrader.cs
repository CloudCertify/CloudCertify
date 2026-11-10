using API.Entities;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

/// <summary>
/// Single grade-and-finish flow shared by the Exam and Practice submit paths. Callers load the
/// Submission once and hand it over; this owns the lifecycle guards (ownership, Mode, finished)
/// so the two paths cannot drift apart and a finished attempt can never be replayed to overwrite
/// its Score (issue #12). Correctness is read from the stamps, never the live answer key (ADR 0007).
/// </summary>
public class SubmissionGrader
{
    public SubmissionGrader(IQuestionRepository questionRepository, ISubmissionRepository submissionRepository)
    {
        _questionRepository = questionRepository;
        _submissionRepository = submissionRepository;
    }

    private readonly IQuestionRepository _questionRepository;
    private readonly ISubmissionRepository _submissionRepository;

    /// <summary>
    /// Finishes a loaded Submission: applies every lifecycle guard (ownership, Mode, not
    /// finished), grades its served set from the verdicts stamped on its Recorded Answers
    /// (ADR 0007), stores the Score and marks it finished. <paramref name="mode"/> is the path the
    /// Submission arrived on; <paramref name="drillId"/> is null for an Exam.
    /// </summary>
    /// <example><c>await grader.Finish(submission, quiz, Mode.Practice, drillId: 2);</c></example>
    public async Task<SubmitQuizResponseDto> Finish(Submission submission, Quiz quiz, Mode mode, int? drillId = null)
    {
        EnsureBelongsTo(submission, quiz.Id, drillId);
        EnsureMode(submission, mode);
        EnsureNotFinished(submission);

        // Grade against the question set served at start, not whatever the client echoes back:
        // an unanswered served question stays in the denominator and counts as wrong (issue #11).
        var questions = await _questionRepository.GetQuestionsByIds(submission.ServedQuestionIds);
        var recorded = submission.RecordedAnswers.ToDictionary(r => r.QuestionId);
        var verdicts = questions.ToDictionary(q => q.Id, q => IsStampedCorrect(recorded, q.Id));

        var grading = ScoringRules.For(mode, quiz)
            .Score(questions.Select(q => new GradedQuestion(q.Domain, verdicts[q.Id])).ToList());

        submission.Score = grading.ScaledScore;
        submission.Finished = true;
        await _submissionRepository.Update(submission);

        return ToResponse(grading, questions, recorded, verdicts, submission.Language);
    }

    /// <summary>
    /// The one definition of correct for grading: the stamp. No Recorded Answer (ADR 0001) or a
    /// null stamp (answers committed before stamping shipped) counts as wrong, as the Outcome
    /// fold already reads it.
    /// </summary>
    private static bool IsStampedCorrect(Dictionary<int, RecordedAnswer> recorded, int questionId) =>
        recorded.TryGetValue(questionId, out var answer) && answer.IsCorrect == true;

    private static SubmitQuizResponseDto ToResponse(GradingResult grading, List<Question> questions,
        Dictionary<int, RecordedAnswer> recorded, Dictionary<int, bool> verdicts, Language language)
    {
        // Confidence is read back off the persisted Recorded Answers, never off the request:
        // the attempt is the source of truth for what was rated (ADR 0006). Unrated answers
        // fall through both counts.
        var rated = questions
            .Select(q => (confidence: recorded.GetValueOrDefault(q.Id)?.Confidence, isCorrect: verdicts[q.Id]))
            .ToList();

        return new SubmitQuizResponseDto
        {
            Score = grading.ScaledScore,
            TotalQuestions = grading.TotalQuestions,
            CorrectCount = grading.CorrectCount,
            ScaledScore = grading.ScaledScore,
            Passed = grading.Passed,
            PassingScore = grading.PassingScore,
            LuckyGuessCount = rated.Count(r => r is { confidence: Confidence.Guess, isCorrect: true }),
            MisconceptionCount = rated.Count(r => r is { confidence: Confidence.Confident, isCorrect: false }),
            DomainBreakdown = grading.DomainBreakdown,
            Questions = questions
                .Select(q => ToResultQuestion(q, recorded.GetValueOrDefault(q.Id), verdicts[q.Id], language))
                .ToList()
        };
    }

    private static QuizResultQuestionDto ToResultQuestion(Question question, RecordedAnswer? recorded,
        bool isCorrect, Language language)
    {
        var selected = recorded?.SelectedAnswerIds ?? [];

        // Result content follows the Submission's stored Language, never the current request
        // header, so an attempt is never mixed-language (ADR 0004).
        return new QuizResultQuestionDto
        {
            Id = question.Id,
            Text = LocalizedContent.Text(question, language),
            Type = question.Type,
            Domain = question.Domain,
            Concepts = question.Concepts,
            ServiceCategory = question.ServiceCategory,
            Services = question.Services,
            Explanation = LocalizedContent.Explanation(question, language),
            Confidence = recorded?.Confidence,
            IsCorrect = isCorrect,
            Answers = question.Answers
                .Select(a => AnswerMapper.ToResultDto(a, selected.Contains(a.Id), language))
                .ToList()
        };
    }

    /// <summary>
    /// Rejects a Submission addressed to the wrong quiz/drill, so a Submission id from one
    /// attempt cannot be replayed against another (issue #12). Shared by the full-quiz finish,
    /// the drill finish, and drill Check so the ownership rule has one definition.
    /// </summary>
    public static void EnsureBelongsTo(Submission submission, int expectedQuizId, int? expectedDrillId)
    {
        if (submission.QuizId == expectedQuizId && submission.DrillId == expectedDrillId)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Submission {submission.Id} belongs to quiz {submission.QuizId}/drill {Describe(submission.DrillId)}, " +
            $"but was addressed to quiz {expectedQuizId}/drill {Describe(expectedDrillId)}");
    }

    /// <summary>
    /// Rejects a Submission whose Mode does not match the path it arrived on, so an Exam attempt
    /// cannot reach a Practice-only behaviour (Check, immutable Recorded Answers) or vice versa.
    /// Mode is the discriminator; the presence of a Drill is not (ADR 0010).
    /// </summary>
    public static void EnsureMode(Submission submission, Mode expected)
    {
        if (submission.Mode == expected)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Submission {submission.Id} is a {submission.Mode} attempt, but was addressed to the {expected} path");
    }

    /// <summary>Rejects an already-finished Submission so a completed attempt cannot be replayed (issue #12).</summary>
    public static void EnsureNotFinished(Submission submission)
    {
        if (!submission.Finished)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Submission {submission.Id} is already finished (Score {submission.Score}); cannot resubmit");
    }

    private static string Describe(int? drillId) => drillId?.ToString() ?? "none";
}

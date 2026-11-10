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
        var served = ServedVerdict.ForEach(questions, submission.RecordedAnswers);

        var grading = ScoringRules.For(mode, quiz)
            .Score(served.Select(v => new GradedQuestion(v.Question.Domain, v.IsCorrect)).ToList());

        submission.Score = grading.ScaledScore;
        submission.Finished = true;
        await _submissionRepository.Update(submission);

        return ToResponse(grading, served, submission.Language);
    }

    /// <summary>One served Question and its Recorded Answer, null when it was never answered.</summary>
    private record ServedVerdict(Question Question, RecordedAnswer? Recorded)
    {
        /// <summary>
        /// The one definition of correct for grading: the stamp. No Recorded Answer (ADR 0001) or a
        /// null stamp (answers committed before stamping shipped) counts as wrong, as the Outcome
        /// fold already reads it.
        /// </summary>
        public bool IsCorrect => Recorded?.IsCorrect == true;

        public Confidence? Confidence => Recorded?.Confidence;

        public static List<ServedVerdict> ForEach(List<Question> questions, List<RecordedAnswer> recordedAnswers)
        {
            var recorded = recordedAnswers.ToDictionary(r => r.QuestionId);
            return questions.Select(q => new ServedVerdict(q, recorded.GetValueOrDefault(q.Id))).ToList();
        }
    }

    private static SubmitQuizResponseDto ToResponse(GradingResult grading, List<ServedVerdict> served, Language language)
    {
        // Confidence is read back off the persisted Recorded Answers, never off the request:
        // the attempt is the source of truth for what was rated (ADR 0006). Unrated answers
        // fall through both counts.
        return new SubmitQuizResponseDto
        {
            Score = grading.ScaledScore,
            TotalQuestions = grading.TotalQuestions,
            CorrectCount = grading.CorrectCount,
            ScaledScore = grading.ScaledScore,
            Passed = grading.Passed,
            PassingScore = grading.PassingScore,
            LuckyGuessCount = served.Count(v => v is { Confidence: Confidence.Guess, IsCorrect: true }),
            MisconceptionCount = served.Count(v => v is { Confidence: Confidence.Confident, IsCorrect: false }),
            DomainBreakdown = grading.DomainBreakdown,
            Questions = served.Select(v => ToResultQuestion(v, language)).ToList()
        };
    }

    private static QuizResultQuestionDto ToResultQuestion(ServedVerdict served, Language language)
    {
        var (question, recorded) = served;
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
            Confidence = served.Confidence,
            IsCorrect = served.IsCorrect,
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

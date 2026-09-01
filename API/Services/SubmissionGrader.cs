using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

/// <summary>
/// Single grade-and-finish flow shared by the Exam and Practice submit paths.
/// Owns the Submission lifecycle guards (ownership + finished) so the two paths cannot
/// drift apart and so a finished attempt can never be replayed to overwrite its Score.
/// See issue #12.
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
    /// Validates the submission belongs to the requested quiz/drill and is not already
    /// finished, grades it against its served question set, persists the score, and marks it
    /// finished. <paramref name="expectedDrillId"/> is null for a full-quiz attempt.
    /// </summary>
    public async Task<SubmitQuizResponseDto> GradeAndFinish(
        int submissionId,
        int expectedQuizId,
        int? expectedDrillId,
        IGradingStrategy strategy,
        List<QuizAnswer> answers)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        EnsureBelongsTo(submission, expectedQuizId, expectedDrillId);
        EnsureNotFinished(submission);

        // Grade against the question set served at start, not whatever the client echoes back:
        // an unanswered served question stays in the denominator and counts as wrong (issue #11).
        var questions = await _questionRepository.GetQuestionsByIds(submission.ServedQuestionIds);
        var gradingResult = strategy.Grade(questions, answers);

        // Confidence is read back off the persisted Recorded Answers, never off the request:
        // the attempt is the source of truth for what was rated (ADR 0006).
        var confidenceByQuestion = submission.RecordedAnswers
            .Where(r => r.Confidence != null)
            .ToDictionary(r => r.QuestionId, r => r.Confidence!.Value);

        var luckyGuessCount = 0;
        var misconceptionCount = 0;

        var resultQuestions = questions.Select(question =>
        {
            var selectedAnswerIds = answers
                .Where(a => a.QuestionId == question.Id)
                .SelectMany(a => a.AnswerIds)
                .ToList();

            var confidence = confidenceByQuestion.TryGetValue(question.Id, out var rating)
                ? rating
                : (Confidence?)null;

            // Unrated questions fall through both branches, so they simply do not count.
            if (confidence != null)
            {
                var isCorrect = QuestionCorrectness.IsCorrect(question, selectedAnswerIds);
                if (confidence == Confidence.Guess && isCorrect) luckyGuessCount++;
                if (confidence == Confidence.Confident && !isCorrect) misconceptionCount++;
            }

            // Result content follows the Submission's stored Language, never the current
            // request header, so an attempt is never mixed-language (ADR 0004).
            return new QuizResultQuestionDto
            {
                Id = question.Id,
                Text = LocalizedContent.Text(question, submission.Language),
                Type = question.Type,
                Domain = question.Domain,
                Concepts = question.Concepts,
                ServiceCategory = question.ServiceCategory,
                Services = question.Services,
                Explanation = LocalizedContent.Explanation(question, submission.Language),
                Confidence = confidence,
                Answers = question.Answers
                    .Select(a => AnswerMapper.ToResultDto(a, selectedAnswerIds.Contains(a.Id), submission.Language))
                    .ToList()
            };
        }).ToList();

        submission.Score = gradingResult.ScaledScore;
        submission.Finished = true;
        await _submissionRepository.Update(submission);

        return new SubmitQuizResponseDto
        {
            Score = gradingResult.ScaledScore,
            TotalQuestions = gradingResult.TotalQuestions,
            CorrectCount = gradingResult.CorrectCount,
            ScaledScore = gradingResult.ScaledScore,
            Passed = gradingResult.Passed,
            LuckyGuessCount = luckyGuessCount,
            MisconceptionCount = misconceptionCount,
            DomainBreakdown = gradingResult.DomainBreakdown,
            Questions = resultQuestions
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

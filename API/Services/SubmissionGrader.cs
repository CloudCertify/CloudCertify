using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

/// <summary>
/// Single grade-and-finish flow shared by the full-quiz and subquiz submit paths.
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
    /// Validates the submission belongs to the requested quiz/subquiz and is not already
    /// finished, grades it against its served question set, persists the score, and marks it
    /// finished. <paramref name="expectedSubquizId"/> is null for a full-quiz attempt.
    /// </summary>
    public async Task<SubmitQuizResponseDto> GradeAndFinish(
        int submissionId,
        int expectedQuizId,
        int? expectedSubquizId,
        IGradingStrategy strategy,
        List<QuizAnswer> answers)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        EnsureBelongsTo(submission, expectedQuizId, expectedSubquizId);
        EnsureNotFinished(submission);

        // Grade against the question set served at start, not whatever the client echoes back:
        // an unanswered served question stays in the denominator and counts as wrong (issue #11).
        var questions = await _questionRepository.GetQuestionsByIds(submission.ServedQuestionIds);
        var gradingResult = strategy.Grade(questions, answers);

        var resultQuestions = questions.Select(question =>
        {
            var selectedAnswerIds = answers
                .Where(a => a.QuestionId == question.Id)
                .SelectMany(a => a.AnswerIds)
                .ToList();

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
            DomainBreakdown = gradingResult.DomainBreakdown,
            Questions = resultQuestions
        };
    }

    /// <summary>
    /// Rejects a Submission addressed to the wrong quiz/subquiz, so a Submission id from one
    /// attempt cannot be replayed against another (issue #12). Shared by the full-quiz finish,
    /// the subquiz finish, and subquiz Check so the ownership rule has one definition.
    /// </summary>
    public static void EnsureBelongsTo(Submission submission, int expectedQuizId, int? expectedSubquizId)
    {
        if (submission.QuizId == expectedQuizId && submission.SubquizId == expectedSubquizId)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Submission {submission.Id} belongs to quiz {submission.QuizId}/subquiz {Describe(submission.SubquizId)}, " +
            $"but was addressed to quiz {expectedQuizId}/subquiz {Describe(expectedSubquizId)}");
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

    private static string Describe(int? subquizId) => subquizId?.ToString() ?? "none";
}

using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

public class SubquizService
{
    public SubquizService(ISubquizRepository subquizRepository, IQuestionRepository questionRepository, ISubmissionRepository submissionRepository, SubmissionGrader submissionGrader)
    {
        _subquizRepository = subquizRepository;
        _questionRepository = questionRepository;
        _submissionRepository = submissionRepository;
        _submissionGrader = submissionGrader;
    }

    private readonly ISubquizRepository _subquizRepository;
    private readonly IQuestionRepository _questionRepository;
    private readonly ISubmissionRepository _submissionRepository;
    private readonly SubmissionGrader _submissionGrader;

    public async Task<List<SubquizDto>> GetSubquizzesByQuizId(int quizId)
    {
        var subquizzes = await _subquizRepository.GetSubquizzesByQuizId(quizId);
        return subquizzes.Select(MapSubquizToDto).ToList();
    }

    /// <summary>
    /// Starts a Subquiz attempt for a logged-in User (userId) or anonymous visitor (email) —
    /// exactly one (ADR 0003).
    /// </summary>
    public async Task<SubquizDetailDto?> StartSubquiz(int quizId, int subquizId, string? email, int? userId)
    {
        AttemptIdentity.EnsureValid(email, userId);
        var subquiz = await _subquizRepository.GetSubquizById(subquizId);

        if (subquiz == null || subquiz.QuizId != quizId)
        {
            return null;
        }

        if (!subquiz.IsAvailable)
        {
            throw new InvalidOperationException("Subquiz is not available");
        }

        // Get parent quiz to fetch questions by domain
        var parentQuiz = await _questionRepository.GetQuestionsByQuizId(quizId);

        var randomQuestions = parentQuiz
            .Where(q => q.Domain == subquiz.Domain)
            .OrderBy(q => Guid.NewGuid())
            .Take(15)
            .ToList();

        var submission = new Submission
        {
            Email = userId == null ? email : null,
            UserId = userId,
            QuizId = quizId,
            SubquizId = subquizId,
            Finished = false,
            ServedQuestionIds = randomQuestions.Select(q => q.Id).ToList(),
        };

        await _submissionRepository.Create(submission);

        return new SubquizDetailDto
        {
            Id = subquiz.Id,
            Title = subquiz.Title,
            Domain = subquiz.Domain,
            Slug = subquiz.Slug,
            CreatedAt = subquiz.CreatedAt,
            SubmissionId = submission.Id,
            Questions = randomQuestions.Select(q => new QuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Images = q.Images,
                Type = q.Type,
                SelectCount = q.SelectCount,
                Difficulty = q.Difficulty,
                Answers = q.Answers.OrderBy(a => Guid.NewGuid()).Select(AnswerMapper.ToDto).ToList()
            }).ToList()
        };
    }

    /// <summary>
    /// Commits one Question's answer (a Check) and returns instant feedback. Records an immutable
    /// Recorded Answer; rejects a Submission for the wrong quiz/subquiz, an already-finished one,
    /// and a Question already Checked. Reachable only via the Subquiz path (ADR 0002): the full
    /// Quiz never reveals per-Question correctness.
    /// </summary>
    public async Task<CheckAnswerResponseDto> CheckAnswer(int quizId, int subquizId, int submissionId, int questionId, List<int> answerIds)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        SubmissionGrader.EnsureBelongsTo(submission, quizId, subquizId);
        SubmissionGrader.EnsureNotFinished(submission);

        if (submission.RecordedAnswers.Any(r => r.QuestionId == questionId))
        {
            throw new InvalidOperationException(
                $"Question {questionId} is already checked on submission {submissionId}; a Recorded Answer is immutable");
        }

        var question = (await _questionRepository.GetQuestionsByIds(new List<int> { questionId })).FirstOrDefault();

        if (question == null)
        {
            throw new InvalidOperationException($"Question {questionId} not found for submission {submissionId}");
        }

        await _submissionRepository.RecordAnswer(new RecordedAnswer
        {
            SubmissionId = submissionId,
            QuestionId = questionId,
            SelectedAnswerIds = answerIds,
        });

        return new CheckAnswerResponseDto
        {
            IsCorrect = QuestionCorrectness.IsCorrect(question, answerIds),
            CorrectAnswerIds = question.Answers.Where(a => a.IsCorrect).Select(a => a.Id).ToList(),
            SelectedAnswerIds = answerIds,
            Explanation = question.Explanation,
        };
    }

    /// <summary>
    /// Finishes a Subquiz attempt: grades the accumulated Recorded Answers through the shared
    /// grader and subquiz Grading Strategy against the served set, so unchecked served Questions
    /// count as wrong (ADR 0001) and the Submission is marked Finished. The grade-and-finish flow
    /// stays in the shared grader so full-quiz and subquiz paths cannot diverge (issue #12).
    /// </summary>
    public async Task<SubmitQuizResponseDto> FinishSubquiz(int quizId, int subquizId, int submissionId)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        var recordedAnswers = submission.RecordedAnswers
            .Select(r => new QuizAnswer { QuestionId = r.QuestionId, AnswerIds = r.SelectedAnswerIds })
            .ToList();

        var strategy = GradingStrategyFactory.GetSubquizStrategy();
        return await _submissionGrader.GradeAndFinish(submissionId, quizId, subquizId, strategy, recordedAnswers);
    }

    private static SubquizDto MapSubquizToDto(Subquiz sq)
    {
        return new SubquizDto
        {
            Id = sq.Id,
            Title = sq.Title,
            Domain = sq.Domain,
            Slug = sq.Slug,
            IsAvailable = sq.IsAvailable
        };
    }
}

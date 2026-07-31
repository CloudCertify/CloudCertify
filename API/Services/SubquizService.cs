using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Drills;
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
    /// <remarks>
    /// A logged-in User's drill is drawn to the Drill Mix from their own Outcomes; an anonymous
    /// visitor gets an empty <see cref="OutcomeSnapshot"/>, which the same draw turns into today's
    /// uniform random 15 — signing in is what makes the drill adaptive (ADR 0008).
    /// </remarks>
    public async Task<SubquizDetailDto?> StartSubquiz(int quizId, int subquizId, string? email, int? userId, Language language = Language.EnUs)
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

        var domainQuestions = parentQuiz.Where(q => q.Domain == subquiz.Domain).ToList();

        var snapshot = userId == null
            ? OutcomeSnapshot.Empty
            : OutcomeSnapshot.Build(
                await _submissionRepository.GetFinishedByUserAndQuiz(userId.Value, quizId),
                domainQuestions.Select(q => q.Id).ToHashSet());

        var drillQuestions = DrillMix.Draw(domainQuestions, snapshot);

        var submission = new Submission
        {
            Email = userId == null ? email : null,
            UserId = userId,
            QuizId = quizId,
            SubquizId = subquizId,
            Finished = false,
            ServedQuestionIds = drillQuestions.Select(q => q.Id).ToList(),
            Language = language,
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
            // Anonymous drills carry no composition: there is nothing adaptive to report, and the
            // absence is what the web app shows the sign-in pitch for.
            Composition = userId == null ? null : Compose(drillQuestions, snapshot),
            Questions = drillQuestions.Select(q => new QuestionDto
            {
                Id = q.Id,
                Text = LocalizedContent.Text(q, language),
                Images = q.Images,
                Type = q.Type,
                SelectCount = q.SelectCount,
                Difficulty = q.Difficulty,
                Answers = q.Answers.OrderBy(a => Guid.NewGuid()).Select(a => AnswerMapper.ToDto(a, language)).ToList()
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

        // Judged once, here: the verdict the visitor is shown is the verdict that is stored, and
        // it is never re-judged against a later answer key (ADR 0007).
        var isCorrect = QuestionCorrectness.IsCorrect(question, answerIds);

        await _submissionRepository.RecordAnswer(new RecordedAnswer
        {
            SubmissionId = submissionId,
            QuestionId = questionId,
            SelectedAnswerIds = answerIds,
            IsCorrect = isCorrect,
        });

        return new CheckAnswerResponseDto
        {
            IsCorrect = isCorrect,
            CorrectAnswerIds = question.Answers.Where(a => a.IsCorrect).Select(a => a.Id).ToList(),
            SelectedAnswerIds = answerIds,
            // The Submission's stored Language, not the current request header (ADR 0004).
            Explanation = LocalizedContent.Explanation(question, submission.Language),
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

    /// <summary>
    /// Counts the served Questions by the Outcome they had <em>going in</em>, so the visitor is
    /// told what the draw did for them before they answer anything.
    /// </summary>
    private static DrillCompositionDto Compose(IEnumerable<Question> drill, OutcomeSnapshot snapshot)
    {
        var byOutcome = drill.CountBy(q => snapshot.OutcomeOf(q.Id)).ToDictionary();

        return new DrillCompositionDto
        {
            Missed = byOutcome.GetValueOrDefault(Outcome.Missed),
            Unseen = byOutcome.GetValueOrDefault(Outcome.Unseen),
            Mastered = byOutcome.GetValueOrDefault(Outcome.Mastered),
        };
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

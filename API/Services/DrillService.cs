using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Drills;
using API.Services.Grading;

namespace API.Services;

/// <summary>
/// The Practice start path and the behaviours that follow from it — Check, and the 0-100
/// grade. A Drill is a named selector: it picks the Questions, it does not decide how the
/// attempt behaves. That is <see cref="Mode"/> (ADR 0010).
/// </summary>
public class DrillService
{
    public DrillService(IDrillRepository drillRepository, IQuestionRepository questionRepository, ISubmissionRepository submissionRepository, SubmissionGrader submissionGrader)
    {
        _drillRepository = drillRepository;
        _questionRepository = questionRepository;
        _submissionRepository = submissionRepository;
        _submissionGrader = submissionGrader;
    }

    private readonly IDrillRepository _drillRepository;
    private readonly IQuestionRepository _questionRepository;
    private readonly ISubmissionRepository _submissionRepository;
    private readonly SubmissionGrader _submissionGrader;

    public async Task<List<DrillDto>> GetDrillsByQuizId(int quizId)
    {
        var drills = await _drillRepository.GetDrillsByQuizId(quizId);
        return drills.Select(MapDrillToDto).ToList();
    }

    /// <summary>
    /// Starts a Drill attempt for a logged-in User (userId) or anonymous visitor (email) —
    /// exactly one (ADR 0003).
    /// </summary>
    /// <remarks>
    /// A logged-in User's drill is drawn to the Drill Mix from their own Outcomes; an anonymous
    /// visitor gets an empty <see cref="OutcomeSnapshot"/>, which the same draw turns into today's
    /// uniform random 15 — signing in is what makes the drill adaptive (ADR 0008).
    /// </remarks>
    public async Task<DrillDetailDto?> StartDrill(int quizId, int drillId, string? email, int? userId, Language language = Language.EnUs)
    {
        AttemptIdentity.EnsureValid(email, userId);
        var drill = await _drillRepository.GetDrillById(drillId);

        if (drill == null || drill.QuizId != quizId)
        {
            return null;
        }

        if (!drill.IsAvailable)
        {
            throw new InvalidOperationException("Drill is not available");
        }

        // The Drill's scope: its Domain's Questions, or the whole parent Quiz when Domain is
        // null (ADR 0010). Everything downstream — the Outcome snapshot and the draw — reads
        // this one pool, so a cross-Domain Drill needs no special case.
        var quizQuestions = await _questionRepository.GetQuestionsByQuizId(quizId);
        var scope = drill.Domain == null
            ? quizQuestions.ToList()
            : quizQuestions.Where(q => q.Domain == drill.Domain).ToList();

        var snapshot = userId == null
            ? OutcomeSnapshot.Empty
            : OutcomeSnapshot.Build(
                await _submissionRepository.GetFinishedByUserAndQuiz(userId.Value, quizId),
                scope.Select(q => q.Id).ToHashSet());

        // The Mistakes draw lands in issue #68; until then every Drill draws the Drill Mix.
        var drillQuestions = DrillMix.Draw(scope, snapshot);

        var submission = new Submission
        {
            Email = userId == null ? email : null,
            UserId = userId,
            QuizId = quizId,
            // Start-path invariant: a drill start is Practice with exactly one Drill (ADR 0010).
            DrillId = drillId,
            Mode = Mode.Practice,
            Finished = false,
            ServedQuestionIds = drillQuestions.Select(q => q.Id).ToList(),
            Language = language,
        };

        await _submissionRepository.Create(submission);

        return new DrillDetailDto
        {
            Id = drill.Id,
            Title = drill.Title,
            Domain = drill.Domain,
            DrawRule = drill.DrawRule,
            Slug = drill.Slug,
            CreatedAt = drill.CreatedAt,
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
    /// Recorded Answer; rejects a Submission for the wrong quiz/drill, an already-finished one,
    /// and a Question already Checked. Practice only (ADR 0002, ADR 0010): an Exam attempt never
    /// reveals per-Question correctness.
    /// </summary>
    public async Task<CheckAnswerResponseDto> CheckAnswer(int quizId, int drillId, int submissionId, int questionId, List<int> answerIds)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        SubmissionGrader.EnsureBelongsTo(submission, quizId, drillId);
        SubmissionGrader.EnsureMode(submission, Mode.Practice);
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
    /// Finishes a Drill attempt: grades the accumulated Recorded Answers through the shared
    /// grader and drill Grading Strategy against the served set, so unchecked served Questions
    /// count as wrong (ADR 0001) and the Submission is marked Finished. The grade-and-finish flow
    /// stays in the shared grader so Exam and Practice paths cannot diverge (issue #12).
    /// </summary>
    public async Task<SubmitQuizResponseDto> FinishDrill(int quizId, int drillId, int submissionId)
    {
        var submission = await _submissionRepository.GetById(submissionId);

        if (submission == null)
        {
            throw new InvalidOperationException($"Submission {submissionId} not found");
        }

        var recordedAnswers = submission.RecordedAnswers
            .Select(r => new QuizAnswer { QuestionId = r.QuestionId, AnswerIds = r.SelectedAnswerIds })
            .ToList();

        SubmissionGrader.EnsureMode(submission, Mode.Practice);

        var strategy = GradingStrategyFactory.GetPracticeStrategy();
        return await _submissionGrader.GradeAndFinish(submissionId, quizId, drillId, strategy, recordedAnswers);
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

    private static DrillDto MapDrillToDto(Drill sq)
    {
        return new DrillDto
        {
            Id = sq.Id,
            Title = sq.Title,
            Domain = sq.Domain,
            DrawRule = sq.DrawRule,
            Slug = sq.Slug,
            IsAvailable = sq.IsAvailable
        };
    }
}

using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

public class QuizService
{
    public QuizService(IQuizRepository quizRepository, IQuestionRepository questionRepository, ISubmissionRepository submissionRepository, SubmissionGrader submissionGrader, ILogger<QuizService> logger)
    {
        _quizRepository = quizRepository;
        _questionRepository = questionRepository;
        _submissionRepository = submissionRepository;
        _submissionGrader = submissionGrader;
        _logger = logger;
    }

    private readonly IQuizRepository _quizRepository;
    private readonly IQuestionRepository _questionRepository;
    private readonly ISubmissionRepository _submissionRepository;
    private readonly SubmissionGrader _submissionGrader;
    private readonly ILogger<QuizService> _logger;
    
    public async Task<IEnumerable<QuizDto>> GetQuizzes()
    {
        var quizzes = await _quizRepository.GetQuizzes();
        return quizzes
            .Select(q => MapQuizToDto(q));
    }

    private static QuizDto MapQuizToDto(Quiz q)
    {
        return new QuizDto
        {
            Id = q.Id,
            Title = q.Title,
            Description = q.Description,
            IconName = q.IconName,
            IsAvailable = q.IsAvailable,
            QuizProvider = q.QuizProvider,
            QuizLevel = q.QuizLevel,
            Slug = q.Slug,
            CreatedAt = q.CreatedAt,
            QuestionCount = q.Questions?.Count ?? 0,
            MinQuestions = q.MinQuestions,
            MaxQuestions = q.MaxQuestions,
            SubQuizzes = q.SubQuizzes?.Select(sq => new SubquizDto
            {
                Id = sq.Id,
                Title = sq.Title,
                Domain = sq.Domain ?? "",
                Slug = sq.Slug,
                IsAvailable = sq.IsAvailable
            }).ToList()
        };
    }
    
    public async Task<QuizDto?> GetQuizById(int quizId)
    {
        var quiz = await _quizRepository.GetQuizById(quizId);
        
        if (quiz == null)
        {
            return null;
        }

        return MapQuizToDto(quiz);
    }
    
     /// <summary>
     /// Starts an attempt for a logged-in User (userId) or an anonymous visitor (email) —
     /// exactly one; a token-derived userId wins over any body email (ADR 0003).
     /// </summary>
     public async Task<QuizDetailDto?> StartQuiz(int quizId, string? email, int? userId, Language language = Language.EnUs)
     {
         AttemptIdentity.EnsureValid(email, userId);
         var quiz = await _quizRepository.GetQuizById(quizId);
         
         if (quiz == null)
         {
             return null;
         }

         if (!quiz.IsAvailable)
         {
             throw new InvalidOperationException("Quiz is not available");
         }

          var pool = quiz.Questions?.ToList() ?? new List<Question>();
          var count = ResolveQuestionCount(quiz, pool.Count);
          var randomQuestions = pool.OrderBy(q => Guid.NewGuid()).Take(count).ToList();

          var submission = new Submission
          {
              Email = userId == null ? email : null,
              UserId = userId,
              QuizId = quizId,
              Finished = false,
              ServedQuestionIds = randomQuestions.Select(q => q.Id).ToList(),
              Language = language,
          };

          await _submissionRepository.Create(submission);

           return new QuizDetailDto
           {
               Id = quiz.Id,
               Title = quiz.Title,
               Description = quiz.Description,
               Slug = quiz.Slug,
               CreatedAt = quiz.CreatedAt,
               SubmissionId = submission.Id,
               Questions = randomQuestions.Select(q => new QuestionDto
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
     /// Picks how many questions to serve from the quiz's [Min, Max] range (fixed when Min == Max).
     /// If the quiz bank is too small, serves all available and logs a warning rather than
     /// silently under-serving the configured count (issue #13).
     /// </summary>
     /// <example>ResolveQuestionCount(clfC02, available: 70) // 65 (fixed)</example>
     private int ResolveQuestionCount(Quiz quiz, int available)
     {
         if (quiz.MinQuestions <= 0 || quiz.MaxQuestions < quiz.MinQuestions)
         {
             throw new InvalidOperationException(
                 $"Quiz {quiz.Id} has invalid question range Min={quiz.MinQuestions}, Max={quiz.MaxQuestions}; expected 0 < Min <= Max");
         }

         var target = quiz.MinQuestions == quiz.MaxQuestions
             ? quiz.MinQuestions
             : Random.Shared.Next(quiz.MinQuestions, quiz.MaxQuestions + 1);

         if (available >= target)
         {
             return target;
         }

         _logger.LogWarning("Quiz {QuizId} bank has {Available} questions but {Target} requested; serving all available",
             quiz.Id, available, target);
         return available;
     }

     /// <summary>
     /// Commits one Question's selected answers to a full-Quiz Submission as the visitor answers
     /// it, overwriting the Question's previous Recorded Answer if it was already answered
     /// (ADR 0006). Rejects a Submission for the wrong quiz, a Subquiz Submission (a Check is
     /// final — ADR 0002), an already-finished attempt, and a Question that was never served.
     /// Returns nothing: this extends commit, not feedback, so no correctness leaks mid-attempt.
     ///
     /// <paramref name="confidence"/> is optional and rides along with the answer: it is stored
     /// as sent, so re-answering a Question re-rates it and null clears a previous rating
     /// (latest wins). It never affects grading (ADR 0006).
     ///
     /// Correctness is judged here and stored on the Recorded Answer, re-stamped on each revision
     /// and never re-judged afterwards (ADR 0007). It stays out of the response.
     /// </summary>
     /// <example>await quizService.AnswerQuestion(quizId: 1, submissionId: 42, questionId: 100, [7], Confidence.Guess);</example>
     public async Task AnswerQuestion(int quizId, int submissionId, int questionId, List<int> answerIds, Confidence? confidence = null)
     {
         var submission = await _submissionRepository.GetById(submissionId);

         if (submission == null)
         {
             throw new InvalidOperationException($"Submission {submissionId} not found");
         }

         // expectedSubquizId null: a Subquiz Submission must go through Check, which is immutable.
         SubmissionGrader.EnsureBelongsTo(submission, quizId, expectedSubquizId: null);
         SubmissionGrader.EnsureNotFinished(submission);

         if (!submission.ServedQuestionIds.Contains(questionId))
         {
             throw new InvalidOperationException(
                 $"Question {questionId} was not served to submission {submissionId}; " +
                 $"served questions are [{string.Join(", ", submission.ServedQuestionIds)}]");
         }

         var question = (await _questionRepository.GetQuestionsByIds([questionId])).FirstOrDefault();

         if (question == null)
         {
             throw new InvalidOperationException($"Question {questionId} not found for submission {submissionId}");
         }

         await _submissionRepository.SaveAnswer(new RecordedAnswer
         {
             SubmissionId = submissionId,
             QuestionId = questionId,
             SelectedAnswerIds = answerIds,
             Confidence = confidence,
             // Stamped now, re-stamped on every revision, never re-judged later (ADR 0007). The
             // visitor is still told nothing: this is stored, not returned.
             IsCorrect = QuestionCorrectness.IsCorrect(question, answerIds),
         });
     }

     /// <summary>
     /// Finishes a full-Quiz attempt: grades the Recorded Answers accumulated during the attempt
     /// — not answers echoed in the request body — against the served set, so there is a single
     /// source of truth for what the visitor answered (ADR 0006) and a served Question with no
     /// Recorded Answer counts as wrong (ADR 0001).
     /// </summary>
     public async Task<SubmitQuizResponseDto> SubmitQuiz(int quizId, int submissionId)
     {
         var quiz = await _quizRepository.GetQuizById(quizId);
         if (quiz == null)
         {
             throw new InvalidOperationException($"Quiz {quizId} not found");
         }

         var submission = await _submissionRepository.GetById(submissionId);
         if (submission == null)
         {
             throw new InvalidOperationException($"Submission {submissionId} not found");
         }

         var answers = submission.RecordedAnswers
             .Select(r => new QuizAnswer { QuestionId = r.QuestionId, AnswerIds = r.SelectedAnswerIds })
             .ToList();

         var strategy = GradingStrategyFactory.GetStrategy(quiz);

         // Lifecycle guards (ownership + finished) and the grade-and-map flow live in the shared
         // grader so the full-quiz and subquiz paths cannot diverge again (issue #12).
         return await _submissionGrader.GradeAndFinish(submissionId, quizId, expectedSubquizId: null, strategy, answers);
     }

     public async Task CreateQuiz(Quiz quiz)
     {
         await _quizRepository.Create(quiz);
     }
 }
using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Repositories;
using API.Services.Grading;

namespace API.Services;

public class QuizService
{
    public QuizService(IQuizRepository quizRepository, ISubmissionRepository submissionRepository, SubmissionGrader submissionGrader, ILogger<QuizService> logger)
    {
        _quizRepository = quizRepository;
        _submissionRepository = submissionRepository;
        _submissionGrader = submissionGrader;
        _logger = logger;
    }

    private readonly IQuizRepository _quizRepository;
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
    
     public async Task<QuizDetailDto?> StartQuiz(int quizId, string email)
     {
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
              Email = email,
              QuizId = quizId,
              Finished = false,
              ServedQuestionIds = randomQuestions.Select(q => q.Id).ToList(),
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

     public async Task<SubmitQuizResponseDto> SubmitQuiz(int quizId, int submissionId, List<QuizAnswer> answers)
     {
         var quiz = await _quizRepository.GetQuizById(quizId);
         if (quiz == null)
         {
             throw new InvalidOperationException($"Quiz {quizId} not found");
         }

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
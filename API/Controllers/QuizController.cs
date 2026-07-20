using API.Dto;
using API.Entities;
using API.Model.Request;
using API.Model.Response;
using API.Services;
using API.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("quiz")]
public class QuizController: ControllerBase
{
    public QuizController(QuizService quizService)
    {
        _quizService = quizService;
    }

    private readonly QuizService _quizService;
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuizDto>>> GetQuizzes()
    {
        var quizzes = await _quizService.GetQuizzes();

        return Ok(quizzes);
    }

    [HttpGet("{quizId}")]
    public async Task<ActionResult<QuizDto>> GetQuizById(int quizId)
    {
        var quiz = await _quizService.GetQuizById(quizId);
        
        if (quiz == null)
        {
            return NotFound();
        }
        
        return Ok(quiz);
    }
    
    /// <summary>
    /// Start a quiz attempt. Anonymous callers must send an email; a bearer token
    /// makes the attempt User-owned and any body email is ignored (ADR 0003).
    /// Question content is served in the Accept-Language header's language
    /// (en-US default, pt-BR supported) and fixed on the Submission (ADR 0004).
    /// </summary>
    [HttpPost("{quizId}/start")]
    public async Task<ActionResult<QuizDetailDto>> StartQuiz(int quizId, [FromBody] StartQuizRequestDto request)
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null && string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email is required for anonymous attempts");
        }

        var language = LanguageResolver.Resolve(Request.Headers.AcceptLanguage);
        Response.Headers.Vary = "Accept-Language"; // cache-safe: response body varies by language (ADR 0004)
        var quiz = await _quizService.StartQuiz(quizId, request.Email, userId, language);

        if (quiz == null)
        {
            return NotFound();
        }

        return Ok(quiz);
    }

    [HttpPost("{quizId}/submit")]
    public async Task<ActionResult<SubmitQuizResponseDto>> SubmitQuiz(int quizId, [FromBody] SubmitQuizRequestDto request)
    {
        var answers = request.Answers;
        
        var result = await _quizService.SubmitQuiz(quizId, request.SubmissionId, answers);
        
        return Ok(result);
    }
}
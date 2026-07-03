using API.Dto;
using API.Model.Request;
using API.Model.Response;
using API.Services;
using API.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Subquiz endpoints: domain-specific subquizzes under parent quiz
/// </summary>
[ApiController]
[Route("quiz/{quizId}/subquizzes")]
public class SubquizController : ControllerBase
{
    private readonly SubquizService _subquizService;

    public SubquizController(SubquizService subquizService)
    {
        _subquizService = subquizService;
    }

    /// <summary>
    /// Get all subquizzes for a quiz
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<SubquizDto>>> GetSubquizzes(int quizId)
    {
        var subquizzes = await _subquizService.GetSubquizzesByQuizId(quizId);
        return Ok(subquizzes);
    }

    /// <summary>
    /// Start a subquiz session. Anonymous callers must send an email; a bearer token
    /// makes the attempt User-owned and any body email is ignored (ADR 0003).
    /// </summary>
    [HttpPost("{subquizId}/start")]
    public async Task<ActionResult<SubquizDetailDto>> StartSubquiz(int quizId, int subquizId, [FromBody] StartQuizRequestDto request)
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null && string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email is required for anonymous attempts");
        }

        var subquizDetail = await _subquizService.StartSubquiz(quizId, subquizId, request.Email, userId);

        if (subquizDetail == null)
        {
            return NotFound();
        }

        return Ok(subquizDetail);
    }

    /// <summary>
    /// Check a single subquiz question: commit its answer and get instant feedback
    /// (correctness, the correct answer ids, and the explanation). The Recorded Answer is
    /// immutable — a checked question cannot be re-answered. Subquiz-only (ADR 0002).
    /// </summary>
    [HttpPost("{subquizId}/check")]
    public async Task<ActionResult<CheckAnswerResponseDto>> CheckAnswer(int quizId, int subquizId, [FromBody] CheckAnswerRequestDto request)
    {
        var result = await _subquizService.CheckAnswer(quizId, subquizId, request.SubmissionId, request.QuestionId, request.AnswerIds);
        return Ok(result);
    }

    /// <summary>
    /// Finish a subquiz attempt: grade the accumulated checked answers and return the
    /// final 0-100 result. Unchecked served questions count as wrong (ADR 0001).
    /// </summary>
    [HttpPost("{subquizId}/finish")]
    public async Task<ActionResult<SubmitQuizResponseDto>> FinishSubquiz(int quizId, int subquizId, [FromBody] FinishSubquizRequestDto request)
    {
        var result = await _subquizService.FinishSubquiz(quizId, subquizId, request.SubmissionId);
        return Ok(result);
    }
}

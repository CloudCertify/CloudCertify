using API.Dto;
using API.Model.Request;
using API.Model.Response;
using API.Services;
using API.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Drill endpoints: named selectors over a parent Quiz's Questions. Every attempt started
/// here is <see cref="API.Entities.Mode.Practice"/> (ADR 0010).
/// </summary>
[ApiController]
[Route("quiz/{quizId}/drills")]
public class DrillController : ControllerBase
{
    private readonly DrillService _drillService;

    public DrillController(DrillService drillService)
    {
        _drillService = drillService;
    }

    /// <summary>
    /// Get all drills for a quiz
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<DrillDto>>> GetDrills(int quizId)
    {
        var drills = await _drillService.GetDrillsByQuizId(quizId);
        return Ok(drills);
    }

    /// <summary>
    /// Start a drill session. Anonymous callers must send an email; a bearer token
    /// makes the attempt User-owned and any body email is ignored (ADR 0003).
    /// Question content is served in the Accept-Language header's language
    /// (en-US default, pt-BR supported) and fixed on the Submission (ADR 0004).
    /// </summary>
    [HttpPost("{drillId}/start")]
    public async Task<ActionResult<DrillDetailDto>> StartDrill(int quizId, int drillId, [FromBody] StartQuizRequestDto request)
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null && string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email is required for anonymous attempts");
        }

        var language = LanguageResolver.Resolve(Request.Headers.AcceptLanguage);
        Response.Headers.Vary = "Accept-Language"; // cache-safe: response body varies by language (ADR 0004)
        var drillDetail = await _drillService.StartDrill(quizId, drillId, request.Email, userId, language);

        if (drillDetail == null)
        {
            return NotFound();
        }

        return Ok(drillDetail);
    }

    /// <summary>
    /// Check a single drill question: commit its answer and get instant feedback
    /// (correctness, the correct answer ids, and the explanation). The Recorded Answer is
    /// immutable — a checked question cannot be re-answered. Practice only (ADR 0002).
    /// </summary>
    [HttpPost("{drillId}/check")]
    public async Task<ActionResult<CheckAnswerResponseDto>> CheckAnswer(int quizId, int drillId, [FromBody] CheckAnswerRequestDto request)
    {
        var result = await _drillService.CheckAnswer(quizId, drillId, request.SubmissionId, request.QuestionId, request.AnswerIds);
        return Ok(result);
    }

    /// <summary>
    /// Finish a drill attempt: grade the accumulated checked answers and return the
    /// final 0-100 result. Unchecked served questions count as wrong (ADR 0001).
    /// </summary>
    [HttpPost("{drillId}/finish")]
    public async Task<ActionResult<SubmitQuizResponseDto>> FinishDrill(int quizId, int drillId, [FromBody] FinishDrillRequestDto request)
    {
        var result = await _drillService.FinishDrill(quizId, drillId, request.SubmissionId);
        return Ok(result);
    }
}

using API.Dto;
using API.Repositories;
using API.Services;
using API.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Logged-in User surface: profile, attempt history, and Progress. Requires a bearer token.</summary>
[ApiController]
[Authorize]
[Route("me")]
public class MeController(
    IUserRepository userRepository,
    ISubmissionRepository submissionRepository,
    ProgressService progressService) : ControllerBase
{
    /// <summary>Current User's profile (provider-sourced email, display name, avatar).</summary>
    [HttpGet]
    public async Task<ActionResult<MeDto>> GetMe()
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        var user = userId == null ? null : await userRepository.GetById(userId.Value);
        if (user == null) return Unauthorized();

        return Ok(new MeDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            Providers = user.Providers.Select(p => p.Kind).ToList(),
        });
    }

    /// <summary>Current User's Submissions, newest first — both logged-in attempts and Claimed ones.</summary>
    [HttpGet("submissions")]
    public async Task<ActionResult<List<MySubmissionDto>>> GetMySubmissions()
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null) return Unauthorized();

        var submissions = await submissionRepository.GetByUserId(userId.Value);
        return Ok(submissions.Select(s => new MySubmissionDto
        {
            Id = s.Id,
            QuizId = s.QuizId,
            DrillId = s.DrillId,
            Mode = s.Mode,
            Finished = s.Finished,
            Score = s.Score,
            CreatedAt = s.CreatedAt,
        }).ToList());
    }

    /// <summary>
    /// Quizzes this User has any finished Submission on — the Progress page selector.
    /// Signed-out is 401 so the client can tell that apart from an empty history.
    /// </summary>
    [HttpGet("progress")]
    public async Task<ActionResult<List<QuizDto>>> GetMyProgressQuizzes()
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null) return Unauthorized();

        return Ok(await progressService.ListQuizzes(userId.Value));
    }

    /// <summary>
    /// Progress on one Quiz: per-Domain Standing, Exam trend, and finished counts.
    /// 404 when the Quiz is missing; an empty history is still 200.
    /// </summary>
    [HttpGet("progress/{quizId}")]
    public async Task<ActionResult<ProgressDto>> GetMyProgress(int quizId)
    {
        var userId = AuthenticatedUserReader.UserIdOf(User);
        if (userId == null) return Unauthorized();

        var progress = await progressService.Get(userId.Value, quizId);
        return progress == null ? NotFound() : Ok(progress);
    }
}

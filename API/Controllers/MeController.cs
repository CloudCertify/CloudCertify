using API.Dto;
using API.Repositories;
using API.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>Logged-in User surface: profile and attempt history. Requires a bearer token.</summary>
[ApiController]
[Authorize]
[Route("me")]
public class MeController(IUserRepository userRepository, ISubmissionRepository submissionRepository) : ControllerBase
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
            SubquizId = s.SubquizId,
            Finished = s.Finished,
            Score = s.Score,
            CreatedAt = s.CreatedAt,
        }).ToList());
    }
}

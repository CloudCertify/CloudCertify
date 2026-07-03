using API.Entities;

namespace API.Dto;

/// <summary>Logged-in User profile: provider-sourced data only (CONTEXT.md).</summary>
public class MeDto
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public List<ProviderKind> Providers { get; set; } = new();
}

/// <summary>One attempt in the logged-in User's history (own + Claimed).</summary>
public class MySubmissionDto
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public int? SubquizId { get; set; }
    public bool Finished { get; set; }
    public int Score { get; set; }
    public DateTime CreatedAt { get; set; }
}

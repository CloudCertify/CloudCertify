using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

/// <summary>
/// A person with an account, created via social login. Optional — quizzes work without one.
/// Carries only provider-sourced profile data (see CONTEXT.md, ADR 0003).
/// </summary>
[Table("User")]
public class User
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }

    /// <summary>Canonical email: the verified email of the first Provider that created the account.</summary>
    public string Email { get; set; } = "";

    public string DisplayName { get; set; } = "";

    public string? AvatarUrl { get; set; }

    public List<UserProvider> Providers { get; set; } = new();

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

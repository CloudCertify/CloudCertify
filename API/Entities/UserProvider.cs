using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

public enum ProviderKind
{
    Google,
    GitHub,
}

/// <summary>
/// An external identity (Google, GitHub) linked to a User. A User can have several;
/// each belongs to exactly one User. Auto-links only on provider-verified email (CONTEXT.md).
/// </summary>
[Table("UserProvider")]
public class UserProvider
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }

    public int UserId { get; set; }

    public ProviderKind Kind { get; set; }

    /// <summary>Stable user id at the provider (Google `sub`, GitHub numeric id).</summary>
    public string SubjectId { get; set; } = "";

    public string Email { get; set; } = "";

    /// <summary>Whether the provider attests the email. Unverified emails never auto-link or claim.</summary>
    public bool EmailVerified { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

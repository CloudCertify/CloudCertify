namespace API.Services;

/// <summary>
/// Guards the Submission ownership invariant: an attempt is born with exactly one of
/// a User (logged-in) or a self-reported email (anonymous). See CONTEXT.md, ADR 0003.
/// </summary>
/// <example>AttemptIdentity.EnsureValid(email: null, userId: 42); // ok</example>
public static class AttemptIdentity
{
    public static void EnsureValid(string? email, int? userId)
    {
        if (userId != null) return;
        if (!string.IsNullOrWhiteSpace(email)) return;
        throw new InvalidOperationException(
            $"Attempt needs an identity: email was '{email}' and no user token was present; expected a non-empty email or a logged-in User");
    }
}

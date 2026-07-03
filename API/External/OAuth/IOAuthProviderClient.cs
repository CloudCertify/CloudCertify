using API.Entities;

namespace API.External.OAuth;

/// <summary>
/// Profile returned by a provider after the code exchange. EmailVerified must reflect the
/// provider's own attestation — auto-link and Claiming trust it (CONTEXT.md, ADR 0003).
/// </summary>
public record OAuthUserProfile(
    string SubjectId,
    string Email,
    bool EmailVerified,
    string DisplayName,
    string? AvatarUrl);

/// <summary>
/// Thin project-owned interface over one provider's OAuth 2.0 authorization-code flow.
/// </summary>
/// <example>var url = client.BuildAuthorizationUrl(state, redirectUri, codeChallenge);</example>
public interface IOAuthProviderClient
{
    ProviderKind Kind { get; }

    /// <param name="codeChallenge">S256 PKCE challenge; ignored by providers that don't support PKCE.</param>
    string BuildAuthorizationUrl(string state, string redirectUri, string codeChallenge);

    Task<OAuthUserProfile> FetchProfile(string code, string redirectUri, string codeVerifier);
}

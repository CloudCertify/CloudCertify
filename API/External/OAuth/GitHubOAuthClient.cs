using System.Text.Json;
using API.Entities;
using Microsoft.Extensions.Options;

namespace API.External.OAuth;

/// <summary>
/// GitHub OAuth client. GitHub OAuth apps ignore PKCE, so the challenge is sent but not relied on;
/// the verified primary email comes from /user/emails (the /user email field can be null/private).
/// </summary>
public class GitHubOAuthClient(HttpClient httpClient, IOptions<AuthSettings> settings) : IOAuthProviderClient
{
    private const string AuthorizeEndpoint = "https://github.com/login/oauth/authorize";
    private const string TokenEndpoint = "https://github.com/login/oauth/access_token";
    private const string UserEndpoint = "https://api.github.com/user";
    private const string EmailsEndpoint = "https://api.github.com/user/emails";

    private readonly OAuthProviderSettings _gitHub = settings.Value.GitHub;

    public ProviderKind Kind => ProviderKind.GitHub;

    public string BuildAuthorizationUrl(string state, string redirectUri, string codeChallenge)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _gitHub.ClientId,
            ["redirect_uri"] = redirectUri,
            ["scope"] = "read:user user:email",
            ["state"] = state,
        };
        return QueryStringComposer.Compose(AuthorizeEndpoint, query);
    }

    public async Task<OAuthUserProfile> FetchProfile(string code, string redirectUri, string codeVerifier)
    {
        var accessToken = await ExchangeCode(code, redirectUri);
        var user = await GetJson(UserEndpoint, accessToken, "GitHub user");
        var (email, verified) = await FetchPrimaryEmail(accessToken);

        return new OAuthUserProfile(
            SubjectId: user.GetProperty("id").GetRawText(),
            Email: email,
            EmailVerified: verified,
            DisplayName: ReadDisplayName(user),
            AvatarUrl: user.TryGetProperty("avatar_url", out var a) ? a.GetString() : null);
    }

    private static string ReadDisplayName(JsonElement user)
    {
        var name = user.TryGetProperty("name", out var n) ? n.GetString() : null;
        var login = user.TryGetProperty("login", out var l) ? l.GetString() : null;
        return name ?? login ?? "";
    }

    private async Task<string> ExchangeCode(string code, string redirectUri)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, TokenEndpoint);
        request.Headers.Accept.ParseAdd("application/json");
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _gitHub.ClientId,
            ["client_secret"] = _gitHub.ClientSecret,
            ["code"] = code,
            ["redirect_uri"] = redirectUri,
        });
        var response = await httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"GitHub token exchange failed with {(int)response.StatusCode}: {content}");
        }
        var payload = JsonDocument.Parse(content).RootElement;
        return payload.TryGetProperty("access_token", out var token) && token.GetString() is { } value
            ? value
            : throw new InvalidOperationException($"GitHub token response missing access_token; got: {content}");
    }

    /// <summary>Primary email with GitHub's verified flag; unverified never auto-links (CONTEXT.md).</summary>
    private async Task<(string Email, bool Verified)> FetchPrimaryEmail(string accessToken)
    {
        var emails = await GetJson(EmailsEndpoint, accessToken, "GitHub user emails");
        foreach (var entry in emails.EnumerateArray())
        {
            if (!entry.GetProperty("primary").GetBoolean()) continue;
            return (entry.GetProperty("email").GetString() ?? "", entry.GetProperty("verified").GetBoolean());
        }
        return ("", false);
    }

    private async Task<JsonElement> GetJson(string url, string accessToken, string operation)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new("Bearer", accessToken);
        request.Headers.UserAgent.ParseAdd("CloudCertify-API");
        var response = await httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"{operation} failed with {(int)response.StatusCode}: {content}");
        }
        return JsonDocument.Parse(content).RootElement;
    }
}

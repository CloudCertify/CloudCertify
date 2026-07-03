using System.Text.Json;
using API.Entities;
using Microsoft.Extensions.Options;

namespace API.External.OAuth;

/// <summary>
/// Google OAuth 2.0 / OpenID Connect client: authorization-code flow with PKCE,
/// profile read from the OIDC userinfo endpoint.
/// </summary>
public class GoogleOAuthClient(HttpClient httpClient, IOptions<AuthSettings> settings) : IOAuthProviderClient
{
    private const string AuthorizeEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

    private readonly OAuthProviderSettings _google = settings.Value.Google;

    public ProviderKind Kind => ProviderKind.Google;

    public string BuildAuthorizationUrl(string state, string redirectUri, string codeChallenge)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _google.ClientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
        };
        return QueryStringComposer.Compose(AuthorizeEndpoint, query);
    }

    public async Task<OAuthUserProfile> FetchProfile(string code, string redirectUri, string codeVerifier)
    {
        var accessToken = await ExchangeCode(code, redirectUri, codeVerifier);
        return await FetchUserInfo(accessToken);
    }

    private async Task<string> ExchangeCode(string code, string redirectUri, string codeVerifier)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _google.ClientId,
            ["client_secret"] = _google.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = redirectUri,
            ["code_verifier"] = codeVerifier,
        });
        var response = await httpClient.PostAsync(TokenEndpoint, body);
        var payload = await ReadJsonOrThrow(response, "Google token exchange");
        return payload.GetProperty("access_token").GetString()
               ?? throw new InvalidOperationException("Google token response missing access_token; expected OAuth token JSON");
    }

    private async Task<OAuthUserProfile> FetchUserInfo(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, UserInfoEndpoint);
        request.Headers.Authorization = new("Bearer", accessToken);
        var response = await httpClient.SendAsync(request);
        var info = await ReadJsonOrThrow(response, "Google userinfo");

        return new OAuthUserProfile(
            SubjectId: info.GetProperty("sub").GetString() ?? "",
            Email: info.GetProperty("email").GetString() ?? "",
            EmailVerified: info.TryGetProperty("email_verified", out var v) && v.GetBoolean(),
            DisplayName: info.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
            AvatarUrl: info.TryGetProperty("picture", out var p) ? p.GetString() : null);
    }

    private static async Task<JsonElement> ReadJsonOrThrow(HttpResponseMessage response, string operation)
    {
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"{operation} failed with {(int)response.StatusCode}: {content}");
        }
        return JsonDocument.Parse(content).RootElement;
    }
}

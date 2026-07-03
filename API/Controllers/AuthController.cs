using API.Entities;
using API.External.OAuth;
using API.Services.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace API.Controllers;

/// <summary>
/// Social login (ADR 0003): API-owned OAuth 2.0 authorization-code flow with state + PKCE.
/// The callback redirects to the SPA with the API-issued JWT in the URL fragment, which
/// never reaches server logs or Referer headers.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController(
    IEnumerable<IOAuthProviderClient> providerClients,
    OAuthStateStore stateStore,
    SocialLoginService loginService,
    UserTokenIssuer tokenIssuer,
    IOptions<AuthSettings> settings) : ControllerBase
{
    private readonly AuthSettings _settings = settings.Value;

    /// <summary>
    /// Starts the OAuth round-trip for a provider ("google" or "github"),
    /// redirecting the browser to the provider's consent screen.
    /// </summary>
    [HttpGet("{provider}/login")]
    public ActionResult StartLogin(string provider, [FromQuery] string? returnTo)
    {
        var client = ResolveClient(provider);
        if (client == null) return NotFound($"Unknown provider '{provider}'; expected google or github");

        var (state, codeChallenge) = stateStore.Issue(returnTo ?? "/");
        return Redirect(client.BuildAuthorizationUrl(state, RedirectUriFor(provider), codeChallenge));
    }

    /// <summary>
    /// Provider redirect target: validates state, exchanges the code, logs the User in
    /// (upsert + auto-link + Claiming), and redirects to the SPA with `#token=...`.
    /// </summary>
    [HttpGet("{provider}/callback")]
    public async Task<ActionResult> Callback(string provider, [FromQuery] string code, [FromQuery] string state)
    {
        var client = ResolveClient(provider);
        if (client == null) return NotFound($"Unknown provider '{provider}'; expected google or github");

        var entry = stateStore.Consume(state);
        if (entry == null) return BadRequest("Invalid or expired OAuth state; restart the login flow");

        var profile = await client.FetchProfile(code, RedirectUriFor(provider), entry.CodeVerifier);
        var user = await loginService.LoginWith(profile, client.Kind);
        return Redirect(SpaCallbackUrl(tokenIssuer.IssueFor(user), entry.ReturnTo));
    }

    private IOAuthProviderClient? ResolveClient(string provider)
    {
        return Enum.TryParse<ProviderKind>(provider, ignoreCase: true, out var kind)
            ? providerClients.FirstOrDefault(c => c.Kind == kind)
            : null;
    }

    private string RedirectUriFor(string provider) =>
        $"{_settings.PublicBaseUrl.TrimEnd('/')}/auth/{provider.ToLowerInvariant()}/callback";

    private string SpaCallbackUrl(string jwt, string returnTo)
    {
        var baseUrl = _settings.WebAppUrl.TrimEnd('/');
        var query = QueryStringComposer.Compose($"{baseUrl}/auth/callback", new() { ["returnTo"] = returnTo });
        return $"{query}#token={jwt}";
    }
}

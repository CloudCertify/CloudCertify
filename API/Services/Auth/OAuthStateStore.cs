using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;

namespace API.Services.Auth;

/// <summary>One in-flight OAuth round-trip: CSRF state plus its PKCE verifier and return path.</summary>
public record OAuthStateEntry(string CodeVerifier, string ReturnTo);

/// <summary>
/// Short-lived server-side store for OAuth `state`, backing CSRF validation and PKCE (RFC 7636).
/// In-memory: fine for the current single-instance deployment.
/// </summary>
/// <example>var state = store.Issue(returnTo: "/dashboard");</example>
public class OAuthStateStore(IMemoryCache cache)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);

    public (string State, string CodeChallenge) Issue(string returnTo)
    {
        var state = RandomToken();
        var verifier = RandomToken();
        cache.Set(CacheKey(state), new OAuthStateEntry(verifier, returnTo), Lifetime);
        return (state, Sha256Base64Url(verifier));
    }

    /// <summary>Single-use: consuming a state removes it, so a replayed callback fails.</summary>
    public OAuthStateEntry? Consume(string state)
    {
        var key = CacheKey(state);
        if (!cache.TryGetValue(key, out OAuthStateEntry? entry)) return null;
        cache.Remove(key);
        return entry;
    }

    private static string CacheKey(string state) => $"oauth-state:{state}";

    private static string RandomToken() =>
        Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string Sha256Base64Url(string verifier) =>
        Base64UrlEncode(SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(verifier)));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

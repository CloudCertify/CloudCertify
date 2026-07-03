namespace API.External.OAuth;

/// <summary>Client credentials for one OAuth provider, bound from Auth:Google / Auth:GitHub.</summary>
public class OAuthProviderSettings
{
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
}

/// <summary>Top-level auth settings, bound from the Auth configuration section.</summary>
public class AuthSettings
{
    /// <summary>HS256 signing secret for API-issued JWTs. Must be at least 32 bytes.</summary>
    public string JwtSecret { get; set; } = "";

    /// <summary>SPA origin the OAuth callback redirects back to with the token fragment.</summary>
    public string WebAppUrl { get; set; } = "";

    /// <summary>Public base URL of this API, used to build provider redirect URIs.</summary>
    public string PublicBaseUrl { get; set; } = "";

    public int TokenLifetimeDays { get; set; } = 30;

    public OAuthProviderSettings Google { get; set; } = new();
    public OAuthProviderSettings GitHub { get; set; } = new();
}

using System.Security.Claims;

namespace API.Services.Auth;

/// <summary>Reads the User id from an API-issued JWT principal, or null when anonymous.</summary>
/// <example>int? userId = AuthenticatedUserReader.UserIdOf(HttpContext.User);</example>
public static class AuthenticatedUserReader
{
    public static int? UserIdOf(ClaimsPrincipal principal)
    {
        // JwtBearer maps the JWT `sub` claim to ClaimTypes.NameIdentifier by default.
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");
        return int.TryParse(sub, out var userId) ? userId : null;
    }
}

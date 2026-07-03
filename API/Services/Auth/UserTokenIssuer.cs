using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Entities;
using API.External.OAuth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace API.Services.Auth;

/// <summary>
/// Signs the API's own self-contained HS256 JWT after social login. 30-day lifetime, no refresh
/// tokens; the SPA holds it in localStorage (ADR 0003).
/// </summary>
/// <example>var jwt = issuer.IssueFor(user); // "eyJhbGciOi..."</example>
public class UserTokenIssuer(IOptions<AuthSettings> settings)
{
    public const string Issuer = "cloudcertify-api";

    private readonly AuthSettings _settings = settings.Value;

    public string IssueFor(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Name, user.DisplayName),
            new(JwtRegisteredClaimNames.Email, user.Email),
        };
        var token = new JwtSecurityToken(
            issuer: Issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_settings.TokenLifetimeDays),
            signingCredentials: SigningCredentialsFor(_settings.JwtSecret));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static SigningCredentials SigningCredentialsFor(string secret) =>
        new(SymmetricKeyFor(secret), SecurityAlgorithms.HmacSha256);

    public static SymmetricSecurityKey SymmetricKeyFor(string secret)
    {
        if (secret.Length < 32)
        {
            throw new InvalidOperationException(
                $"Auth:JwtSecret has {secret.Length} chars; expected at least 32 for HS256");
        }
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }
}

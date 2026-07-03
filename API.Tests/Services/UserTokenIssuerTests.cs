using System.IdentityModel.Tokens.Jwt;
using API.Entities;
using API.External.OAuth;
using API.Services.Auth;
using Microsoft.Extensions.Options;

namespace API.Tests.Services;

public class UserTokenIssuerTests
{
    private const string Secret = "0123456789abcdef0123456789abcdef";

    private static UserTokenIssuer CreateIssuer(int lifetimeDays = 30) =>
        new(Options.Create(new AuthSettings { JwtSecret = Secret, TokenLifetimeDays = lifetimeDays }));

    [Fact]
    public void IssueFor_EmbedsUserIdAndProfile_WithConfiguredLifetime()
    {
        var user = new User { Id = 42, Email = "x@gmail.com", DisplayName = "Snowye" };

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(CreateIssuer().IssueFor(user));

        Assert.Equal("42", jwt.Subject);
        Assert.Equal(UserTokenIssuer.Issuer, jwt.Issuer);
        Assert.True(jwt.ValidTo > DateTime.UtcNow.AddDays(29), "expected ~30-day expiry (ADR 0003)");
    }

    [Fact]
    public void SymmetricKeyFor_Throws_WhenSecretTooShort()
    {
        var error = Assert.Throws<InvalidOperationException>(() => UserTokenIssuer.SymmetricKeyFor("short"));
        Assert.Contains("at least 32", error.Message);
    }
}

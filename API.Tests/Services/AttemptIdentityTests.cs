using API.Services;

namespace API.Tests.Services;

/// <summary>Submission ownership invariant: exactly one of email/userId at birth (CONTEXT.md).</summary>
public class AttemptIdentityTests
{
    [Fact]
    public void EnsureValid_Passes_WithUserIdOnly() =>
        AttemptIdentity.EnsureValid(email: null, userId: 42);

    [Fact]
    public void EnsureValid_Passes_WithEmailOnly() =>
        AttemptIdentity.EnsureValid(email: "u@e.com", userId: null);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EnsureValid_Throws_WhenNeitherIdentityPresent(string? email)
    {
        var error = Assert.Throws<InvalidOperationException>(
            () => AttemptIdentity.EnsureValid(email, userId: null));
        Assert.Contains("identity", error.Message);
    }
}

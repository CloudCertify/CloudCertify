using API.Entities;
using API.External.OAuth;
using API.Repositories;
using API.Services.Auth;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace API.Tests.Services;

/// <summary>
/// Login resolution rules (CONTEXT.md, ADR 0003): resolve by provider subject, auto-link only on
/// provider-verified email, otherwise create — and Claiming runs on every login.
/// </summary>
public class SocialLoginServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ISubmissionRepository> _submissions = new();

    private SocialLoginService CreateService() =>
        new(_users.Object, _submissions.Object, NullLogger<SocialLoginService>.Instance);

    private static OAuthUserProfile Profile(bool verified = true, string email = "x@gmail.com") =>
        new("sub-1", email, verified, "Snowye", "https://avatar.test/x.png");

    private static User ExistingUser(int id = 7, string email = "x@gmail.com", bool verified = true)
    {
        var user = new User { Id = id, Email = email, DisplayName = "Snowye" };
        user.Providers.Add(new UserProvider
        {
            UserId = id, Kind = ProviderKind.Google, SubjectId = "sub-1", Email = email, EmailVerified = verified,
        });
        return user;
    }

    [Fact]
    public async Task LoginWith_ReturnsExistingUser_WhenProviderSubjectKnown()
    {
        var existing = ExistingUser();
        _users.Setup(r => r.GetByProviderSubject(ProviderKind.Google, "sub-1")).ReturnsAsync(existing);

        var user = await CreateService().LoginWith(Profile(), ProviderKind.Google);

        Assert.Equal(existing.Id, user.Id);
        _users.Verify(r => r.Create(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task LoginWith_AutoLinksProvider_WhenVerifiedEmailMatchesExistingUser()
    {
        var existing = ExistingUser();
        _users.Setup(r => r.GetByProviderSubject(ProviderKind.GitHub, "sub-1")).ReturnsAsync((User?)null);
        _users.Setup(r => r.GetByVerifiedProviderEmail("x@gmail.com")).ReturnsAsync(existing);
        _users.Setup(r => r.GetById(existing.Id)).ReturnsAsync(existing);

        var user = await CreateService().LoginWith(Profile(), ProviderKind.GitHub);

        Assert.Equal(existing.Id, user.Id);
        _users.Verify(r => r.AddProvider(It.Is<UserProvider>(
            p => p.UserId == existing.Id && p.Kind == ProviderKind.GitHub)), Times.Once);
    }

    [Fact]
    public async Task LoginWith_CreatesSeparateUser_WhenEmailUnverified()
    {
        _users.Setup(r => r.GetByProviderSubject(ProviderKind.GitHub, "sub-1")).ReturnsAsync((User?)null);
        _users.Setup(r => r.Create(It.IsAny<User>())).ReturnsAsync((User u) => u);

        await CreateService().LoginWith(Profile(verified: false), ProviderKind.GitHub);

        // Unverified emails never auto-link (CONTEXT.md): the email lookup must not even run.
        _users.Verify(r => r.GetByVerifiedProviderEmail(It.IsAny<string>()), Times.Never);
        _users.Verify(r => r.Create(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task LoginWith_ClaimsAnonymousSubmissions_ForAllVerifiedProviderEmails()
    {
        var existing = ExistingUser();
        existing.Providers.Add(new UserProvider
        {
            UserId = existing.Id, Kind = ProviderKind.GitHub, SubjectId = "gh-2",
            Email = "y@othermail.com", EmailVerified = true,
        });
        _users.Setup(r => r.GetByProviderSubject(ProviderKind.Google, "sub-1")).ReturnsAsync(existing);

        await CreateService().LoginWith(Profile(), ProviderKind.Google);

        _submissions.Verify(r => r.ClaimAnonymousSubmissions(existing.Id, It.Is<IReadOnlyCollection<string>>(
            emails => emails.Contains("x@gmail.com") && emails.Contains("y@othermail.com"))), Times.Once);
    }

    [Fact]
    public async Task LoginWith_SkipsClaiming_WhenNoVerifiedEmails()
    {
        var existing = ExistingUser(verified: false);
        _users.Setup(r => r.GetByProviderSubject(ProviderKind.Google, "sub-1")).ReturnsAsync(existing);

        await CreateService().LoginWith(Profile(verified: false), ProviderKind.Google);

        _submissions.Verify(
            r => r.ClaimAnonymousSubmissions(It.IsAny<int>(), It.IsAny<IReadOnlyCollection<string>>()),
            Times.Never);
    }
}

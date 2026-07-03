using API.Entities;
using API.External.OAuth;
using API.Repositories;

namespace API.Services.Auth;

/// <summary>
/// Turns a provider profile into a logged-in User: resolves by provider subject, auto-links by
/// provider-verified email, or creates a new User — then runs Claiming (CONTEXT.md, ADR 0003).
/// </summary>
/// <example>var user = await loginService.LoginWith(profileFromGoogle, ProviderKind.Google);</example>
public class SocialLoginService(
    IUserRepository userRepository,
    ISubmissionRepository submissionRepository,
    ILogger<SocialLoginService> logger)
{
    public async Task<User> LoginWith(OAuthUserProfile profile, ProviderKind kind)
    {
        var user = await ResolveUser(profile, kind);
        await ClaimSubmissions(user);
        return user;
    }

    private async Task<User> ResolveUser(OAuthUserProfile profile, ProviderKind kind)
    {
        var existing = await userRepository.GetByProviderSubject(kind, profile.SubjectId);
        if (existing != null) return existing;

        // Auto-link only on provider-verified email; unverified creates a separate User (CONTEXT.md).
        var byEmail = profile.EmailVerified
            ? await userRepository.GetByVerifiedProviderEmail(profile.Email)
            : null;
        if (byEmail != null) return await LinkProvider(byEmail, profile, kind);

        return await CreateUser(profile, kind);
    }

    private async Task<User> LinkProvider(User user, OAuthUserProfile profile, ProviderKind kind)
    {
        await userRepository.AddProvider(ProviderFrom(profile, kind, user.Id));
        logger.LogInformation("Auto-linked {Kind} provider to user {UserId}", kind, user.Id);
        return await userRepository.GetById(user.Id) ?? user;
    }

    private async Task<User> CreateUser(OAuthUserProfile profile, ProviderKind kind)
    {
        var user = new User
        {
            Email = profile.Email,
            DisplayName = profile.DisplayName,
            AvatarUrl = profile.AvatarUrl,
        };
        user.Providers.Add(ProviderFrom(profile, kind, userId: 0));
        return await userRepository.Create(user);
    }

    /// <summary>Runs on every login; idempotent. Matches all provider-verified emails (CONTEXT.md).</summary>
    private async Task ClaimSubmissions(User user)
    {
        var verifiedEmails = user.Providers
            .Where(p => p.EmailVerified)
            .Select(p => p.Email)
            .Distinct()
            .ToList();
        if (verifiedEmails.Count == 0) return;

        var claimed = await submissionRepository.ClaimAnonymousSubmissions(user.Id, verifiedEmails);
        if (claimed > 0)
        {
            logger.LogInformation("Claimed {Count} anonymous submissions for user {UserId}", claimed, user.Id);
        }
    }

    private static UserProvider ProviderFrom(OAuthUserProfile profile, ProviderKind kind, int userId) => new()
    {
        UserId = userId,
        Kind = kind,
        SubjectId = profile.SubjectId,
        Email = profile.Email,
        EmailVerified = profile.EmailVerified,
    };
}

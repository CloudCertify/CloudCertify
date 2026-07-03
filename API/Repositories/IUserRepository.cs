using API.Entities;

namespace API.Repositories;

/// <summary>Persistence for <see cref="User"/>s and their linked <see cref="UserProvider"/>s.</summary>
public interface IUserRepository
{
    Task<User?> GetByProviderSubject(ProviderKind kind, string subjectId);

    /// <summary>Finds the User owning any Provider with this verified email — the auto-link key.</summary>
    Task<User?> GetByVerifiedProviderEmail(string email);

    Task<User?> GetById(int userId);
    Task<User> Create(User user);
    Task AddProvider(UserProvider provider);
}

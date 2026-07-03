using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Repositories;

public class UserRepository(ApplicationDbContext context) : IUserRepository
{
    public async Task<User?> GetByProviderSubject(ProviderKind kind, string subjectId)
    {
        return await context.User
            .Include(u => u.Providers)
            .FirstOrDefaultAsync(u => u.Providers.Any(p => p.Kind == kind && p.SubjectId == subjectId));
    }

    public async Task<User?> GetByVerifiedProviderEmail(string email)
    {
        return await context.User
            .Include(u => u.Providers)
            .FirstOrDefaultAsync(u => u.Providers.Any(p => p.EmailVerified && p.Email == email));
    }

    public async Task<User?> GetById(int userId)
    {
        return await context.User
            .Include(u => u.Providers)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<User> Create(User user)
    {
        await context.User.AddAsync(user);
        await context.SaveChangesAsync();
        return user;
    }

    public async Task AddProvider(UserProvider provider)
    {
        await context.UserProvider.AddAsync(provider);
        await context.SaveChangesAsync();
    }
}

using CMS.API.Repositories;

namespace CMS.API.Services;

// Loads the JWT signing key from SysConfig once and caches it for the app lifetime.
// Registered as a singleton, so it creates a scope on demand to reach the scoped
// IAuthRepository (which owns the SysConfig-reading logic) rather than capturing it.
public class SigningKeyProvider(IServiceScopeFactory scopeFactory) : ISigningKeyProvider
{
    private readonly Lock _gate = new();
    private string? _cachedKey;

    public string GetSigningKey()
    {
        if (_cachedKey is not null)
        {
            return _cachedKey;
        }

        lock (_gate)
        {
            if (_cachedKey is null)
            {
                using var scope = scopeFactory.CreateScope();
                var repository = scope.ServiceProvider.GetRequiredService<IAuthRepository>();
                _cachedKey = repository.GetSigningKeyAsync().GetAwaiter().GetResult();
            }

            return _cachedKey;
        }
    }
}

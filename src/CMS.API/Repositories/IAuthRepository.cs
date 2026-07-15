using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IAuthRepository
{
    // Returns the authenticated user (with role ids) when userId + password match an
    // active AppUser; null on any failure (unknown user, inactive, wrong password).
    Task<AuthenticatedUser?> ValidateCredentialsAsync(string userId, string password);

    // The JWT signing secret, read from SysConfig 'appConfig'.symmetricSecurityKey.
    Task<string> GetSigningKeyAsync();

    // Updates the display name of a single user. Returns true when a row was updated
    // (false when no AppUser has that UserId). Only UserName changes — never the key
    // or roles.
    Task<bool> UpdateUserNameAsync(string userId, string userName);

    // True when currentPassword (hashed the same way login does) matches the active
    // user's stored PasswordHash. Used to gate a self-service password change.
    Task<bool> VerifyPasswordAsync(string userId, string currentPassword);

    // Sets PasswordHash = SHA256(newPassword) (uppercase hex) and PasswordUpdatedTime = now
    // for the user. Returns true when a row was updated. The plaintext never leaves this
    // method un-hashed and the hash is never selected back out.
    Task<bool> ChangePasswordAsync(string userId, string newPassword);
}

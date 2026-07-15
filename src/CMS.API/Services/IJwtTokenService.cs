using CMS.API.Models;

namespace CMS.API.Services;

public interface IJwtTokenService
{
    // Builds a signed JWT for the authenticated user, carrying userId, userName and
    // one role claim per role id, valid for JwtTokenService.TokenLifetime.
    string CreateToken(AuthenticatedUser user, string signingKey);
}

namespace CMS.API.Services;

public interface ISigningKeyProvider
{
    // The JWT signing secret (SysConfig 'appConfig'.symmetricSecurityKey), loaded once
    // and cached. Used to validate incoming bearer tokens; it must be the same key the
    // AuthController signs tokens with.
    string GetSigningKey();
}

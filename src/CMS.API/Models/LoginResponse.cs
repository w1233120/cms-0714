namespace CMS.API.Models;

// The user profile returned on a successful login. PasswordHash is intentionally
// absent — it never leaves the backend.
public class LoginResponse
{
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string AccessToken { get; set; } = default!;
}

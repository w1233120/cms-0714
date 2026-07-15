namespace CMS.API.Models;

// Body of POST /api/auth/change-password. The endpoint always changes the *authenticated*
// user's password (UserId from the JWT) — there is no UserId here. No password hash ever
// crosses this boundary; the API hashes the plaintext server-side.
public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
    public string ConfirmNewPassword { get; set; } = default!;
}

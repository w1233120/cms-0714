namespace CMS.API.Models;

// Body of PUT /api/auth/profile. UserName is the only field that takes effect; the
// endpoint always updates the *authenticated* user (UserId from the JWT). UserId is
// present here only so a confused/malicious client that sends one is provably ignored
// — it is never used to choose which row is updated.
public class UpdateProfileRequest
{
    public string? UserId { get; set; }
    public string UserName { get; set; } = default!;
}

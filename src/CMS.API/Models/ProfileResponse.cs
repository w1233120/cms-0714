namespace CMS.API.Models;

// The signed-in user's profile after a successful update: the identity (UserId, never
// changeable) and the canonical (trimmed) UserName the frontend should now display.
public class ProfileResponse
{
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
}

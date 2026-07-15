namespace CMS.API.Models;

// Result of a successful credential check: identity plus role ids, used to build
// the JWT. Never carries PasswordHash.
public class AuthenticatedUser
{
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public List<string> RoleIds { get; set; } = [];
}

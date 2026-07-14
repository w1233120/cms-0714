namespace CMS.API.Models;

public class AppUserRequest
{
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public List<string> RoleIds { get; set; } = [];

    // PasswordHash is intentionally absent: it is never accepted from the caller.
    // Create seeds it from SysConfig; reset-password is the only other writer.
}

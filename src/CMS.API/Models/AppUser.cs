namespace CMS.API.Models;

public class AppUser
{
    public int Pkid { get; set; }
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public bool IsActive { get; set; }
    public DateTime? PasswordUpdatedTime { get; set; }
    public int RoleCount { get; set; }

    // Populated on GetById only (used to pre-select roles in the edit form).
    public List<string> RoleIds { get; set; } = [];

    // PasswordHash is intentionally absent: it never leaves the backend.
}

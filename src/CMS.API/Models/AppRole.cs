namespace CMS.API.Models;

public class AppRole
{
    public int Pkid { get; set; }
    public string RoleId { get; set; } = default!;
    public string RoleName { get; set; } = default!;
    public int PermissionLevel { get; set; }
    public string? Description { get; set; }
    public int UserCount { get; set; }

    // Populated on GetById only (used to pre-select users in the edit form).
    public List<string> UserIds { get; set; } = [];
}

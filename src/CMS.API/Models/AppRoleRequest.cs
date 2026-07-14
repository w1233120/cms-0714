namespace CMS.API.Models;

public class AppRoleRequest
{
    public string RoleId { get; set; } = default!;
    public string RoleName { get; set; } = default!;
    public int PermissionLevel { get; set; } = 100;
    public string? Description { get; set; }
    public List<string> UserIds { get; set; } = [];
}

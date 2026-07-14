namespace CMS.API.Models;

public class AppUserQuery
{
    public string? Keyword { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? PasswordUpdatedFrom { get; set; }
    public DateTime? PasswordUpdatedTo { get; set; }
}

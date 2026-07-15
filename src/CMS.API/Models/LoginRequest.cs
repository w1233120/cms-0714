namespace CMS.API.Models;

public class LoginRequest
{
    public string UserId { get; set; } = default!;
    public string Password { get; set; } = default!;
}

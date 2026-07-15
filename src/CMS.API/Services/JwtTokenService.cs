using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CMS.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace CMS.API.Services;

public class JwtTokenService : IJwtTokenService
{
    public static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(24);

    public string CreateToken(AuthenticatedUser user, string signingKey)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("userId", user.UserId),
            new("userName", user.UserName),
        };
        claims.AddRange(user.RoleIds.Select(roleId => new Claim(ClaimTypes.Role, roleId)));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(TokenLifetime),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

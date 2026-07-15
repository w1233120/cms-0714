using System.Security.Cryptography;
using System.Text;
using CMS.API.Repositories;

namespace CMS.API.Tests.Repositories;

// The DB-touching parts of AppUserRepository can't run without SQL Server, so these cover
// the pure, security-relevant pieces of a password reset: the hash derived from the
// SysConfig default password, and that the reset SQL stamps PasswordUpdatedTime (rather
// than clearing it).
public class AppUserRepositoryTests
{
    [Fact]
    public void HashDefaultPassword_ReturnsUppercaseHexSha256OfConfiguredDefault()
    {
        const string defaultPassword = "Passw0rd!";
        var configValue = $$"""{"defaultPassword":"{{defaultPassword}}","symmetricSecurityKey":"ignored"}""";

        var hash = AppUserRepository.HashDefaultPassword(configValue);

        var expected = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(defaultPassword)));
        Assert.Equal(expected, hash);
        // Uppercase hex, no lowercase (the exact stored format).
        Assert.Equal(hash.ToUpperInvariant(), hash);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void HashDefaultPassword_MissingOrEmptyConfig_Throws(string configValue)
    {
        Assert.Throws<InvalidOperationException>(() => AppUserRepository.HashDefaultPassword(configValue));
    }

    [Fact]
    public void HashDefaultPassword_ConfigWithoutDefaultPassword_Throws()
    {
        Assert.Throws<InvalidOperationException>(
            () => AppUserRepository.HashDefaultPassword("""{"symmetricSecurityKey":"only-this"}"""));
    }

    [Fact]
    public void ResetPasswordSql_SetsPasswordHashAndStampsUpdatedTimeToNow()
    {
        // A reset must record the change time (GETDATE()), not clear it to NULL.
        Assert.Contains("PasswordHash = @PasswordHash", AppUserRepository.ResetPasswordSql);
        Assert.Contains("PasswordUpdatedTime = GETDATE()", AppUserRepository.ResetPasswordSql);
        Assert.DoesNotContain("PasswordUpdatedTime = NULL", AppUserRepository.ResetPasswordSql);
    }
}

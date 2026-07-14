using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class AppUsersControllerTests
{
    private readonly Mock<IAppUserRepository> _repository = new();
    private readonly AppUsersController _controller;

    public AppUsersControllerTests()
    {
        _controller = new AppUsersController(_repository.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithAllUsers()
    {
        var users = new List<AppUser>
        {
            new() { Pkid = 1, UserId = "helen", UserName = "Helen Wu", IsActive = true, RoleCount = 2 },
            new() { Pkid = 2, UserId = "sam", UserName = "Sam Lin", IsActive = false, RoleCount = 0 }
        };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(users);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(users, okResult.Value);
    }

    [Fact]
    public async Task Query_WithKeywordAndIsActive_ReturnsFilteredUsers()
    {
        var query = new AppUserQuery { Keyword = "helen", IsActive = true };
        var users = new List<AppUser>
        {
            new() { Pkid = 1, UserId = "helen", UserName = "Helen Wu", IsActive = true }
        };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(users);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(users, okResult.Value);
    }

    [Fact]
    public async Task GetById_ExistingUser_ReturnsOk()
    {
        var user = new AppUser { Pkid = 1, UserId = "helen", UserName = "Helen Wu", IsActive = true, RoleIds = ["Admin"] };
        _repository.Setup(r => r.GetByIdAsync("helen")).ReturnsAsync(user);

        var result = await _controller.GetById("helen");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(user, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingUser_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync("missing")).ReturnsAsync((AppUser?)null);

        var result = await _controller.GetById("missing");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewUser_ReturnsCreatedAtAction()
    {
        var request = new AppUserRequest { UserId = "amy", UserName = "Amy Chen", RoleIds = ["Admin"] };
        var created = new AppUser { Pkid = 3, UserId = "amy", UserName = "Amy Chen", IsActive = true, RoleIds = ["Admin"] };

        _repository.Setup(r => r.ExistsAsync("amy")).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).Returns(Task.CompletedTask);
        _repository.Setup(r => r.GetByIdAsync("amy")).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_DuplicateUserId_ReturnsConflict()
    {
        var request = new AppUserRequest { UserId = "helen", UserName = "Helen Wu" };
        _repository.Setup(r => r.ExistsAsync("helen")).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result.Result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<AppUserRequest>()), Times.Never);
    }

    [Fact]
    public async Task Update_ExistingUser_ReturnsOk()
    {
        var request = new AppUserRequest { UserId = "helen", UserName = "Helen Wu (updated)", IsActive = false };
        var updated = new AppUser { Pkid = 1, UserId = "helen", UserName = "Helen Wu (updated)", IsActive = false };

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync("helen")).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingUser_ReturnsNotFound()
    {
        var request = new AppUserRequest { UserId = "missing", UserName = "Missing" };
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingUser_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync("helen")).ReturnsAsync(true);

        var result = await _controller.Delete("helen");

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingUser_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync("missing")).ReturnsAsync(false);

        var result = await _controller.Delete("missing");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ResetPassword_ExistingUser_ReturnsNoContent()
    {
        _repository.Setup(r => r.ResetPasswordAsync("helen")).ReturnsAsync(true);

        var result = await _controller.ResetPassword("helen");

        Assert.IsType<NoContentResult>(result);
        _repository.Verify(r => r.ResetPasswordAsync("helen"), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_MissingUser_ReturnsNotFound()
    {
        _repository.Setup(r => r.ResetPasswordAsync("missing")).ReturnsAsync(false);

        var result = await _controller.ResetPassword("missing");

        Assert.IsType<NotFoundResult>(result);
    }
}

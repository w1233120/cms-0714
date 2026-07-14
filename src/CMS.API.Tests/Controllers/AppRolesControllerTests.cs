using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class AppRolesControllerTests
{
    private readonly Mock<IAppRoleRepository> _repository = new();
    private readonly AppRolesController _controller;

    public AppRolesControllerTests()
    {
        _controller = new AppRolesController(_repository.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithAllRoles()
    {
        var roles = new List<AppRole>
        {
            new() { Pkid = 1, RoleId = "Admin", RoleName = "Administrator", PermissionLevel = 1, UserCount = 3 },
            new() { Pkid = 2, RoleId = "User", RoleName = "User", PermissionLevel = 100, UserCount = 9 }
        };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(roles);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(roles, okResult.Value);
    }

    [Fact]
    public async Task Query_WithKeyword_ReturnsFilteredRoles()
    {
        var query = new AppRoleQuery { Keyword = "Admin" };
        var roles = new List<AppRole>
        {
            new() { Pkid = 1, RoleId = "Admin", RoleName = "Administrator", PermissionLevel = 1 }
        };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(roles);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(roles, okResult.Value);
    }

    [Fact]
    public async Task GetById_ExistingRole_ReturnsOk()
    {
        var role = new AppRole { Pkid = 1, RoleId = "Admin", RoleName = "Administrator", PermissionLevel = 1, UserIds = ["helen"] };
        _repository.Setup(r => r.GetByIdAsync("Admin")).ReturnsAsync(role);

        var result = await _controller.GetById("Admin");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(role, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingRole_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync("Missing")).ReturnsAsync((AppRole?)null);

        var result = await _controller.GetById("Missing");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewRole_ReturnsCreatedAtAction()
    {
        var request = new AppRoleRequest { RoleId = "Editor", RoleName = "Editor", PermissionLevel = 50 };
        var created = new AppRole { Pkid = 3, RoleId = "Editor", RoleName = "Editor", PermissionLevel = 50 };

        _repository.Setup(r => r.ExistsAsync("Editor")).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).Returns(Task.CompletedTask);
        _repository.Setup(r => r.GetByIdAsync("Editor")).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_DuplicateRoleId_ReturnsConflict()
    {
        var request = new AppRoleRequest { RoleId = "Admin", RoleName = "Administrator", PermissionLevel = 1 };
        _repository.Setup(r => r.ExistsAsync("Admin")).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result.Result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<AppRoleRequest>()), Times.Never);
    }

    [Fact]
    public async Task Update_ExistingRole_ReturnsOk()
    {
        var request = new AppRoleRequest { RoleId = "Admin", RoleName = "Administrator Updated", PermissionLevel = 1 };
        var updated = new AppRole { Pkid = 1, RoleId = "Admin", RoleName = "Administrator Updated", PermissionLevel = 1 };

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync("Admin")).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingRole_ReturnsNotFound()
    {
        var request = new AppRoleRequest { RoleId = "Missing", RoleName = "Missing", PermissionLevel = 1 };
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingRole_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync("Admin")).ReturnsAsync(true);

        var result = await _controller.Delete("Admin");

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingRole_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync("Missing")).ReturnsAsync(false);

        var result = await _controller.Delete("Missing");

        Assert.IsType<NotFoundResult>(result);
    }
}

using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class CourseGroupsControllerTests
{
    private readonly Mock<ICourseGroupRepository> _repository = new();
    private readonly CourseGroupsController _controller;

    public CourseGroupsControllerTests()
    {
        _controller = new CourseGroupsController(_repository.Object);
    }

    private static CourseGroup MakeCourseGroup(short pkid, string description) => new()
    {
        Pkid = pkid,
        Description = description
    };

    private static CourseGroupRequest MakeRequest(short pkid, string description) => new()
    {
        Pkid = pkid,
        Description = description
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithAllCourseGroups()
    {
        var groups = new List<CourseGroup> { MakeCourseGroup(1, "雲端技術"), MakeCourseGroup(2, "資料庫") };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(groups);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(groups, okResult.Value);
    }

    [Fact]
    public async Task Query_WithKeyword_ReturnsFilteredCourseGroups()
    {
        var query = new CourseGroupQuery { Keyword = "雲端" };
        var groups = new List<CourseGroup> { MakeCourseGroup(1, "雲端技術") };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(groups);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(groups, okResult.Value);
    }

    [Fact]
    public async Task GetById_ExistingCourseGroup_ReturnsOk()
    {
        var group = MakeCourseGroup(1, "雲端技術");
        _repository.Setup(r => r.GetByIdAsync((short)1)).ReturnsAsync(group);

        var result = await _controller.GetById(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(group, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingCourseGroup_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync((short)99)).ReturnsAsync((CourseGroup?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewCourseGroup_ReturnsCreatedAtActionWithGeneratedPkid()
    {
        // pkid is IDENTITY: the caller sends 0 and the repository hands back the DB-generated key.
        var request = MakeRequest(0, "資料庫");
        var created = MakeCourseGroup(7, "資料庫");

        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync((short)7);
        _repository.Setup(r => r.GetByIdAsync((short)7)).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        Assert.Equal((short)7, createdResult.RouteValues!["id"]);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Update_ExistingCourseGroup_ReturnsOk()
    {
        var request = MakeRequest(1, "雲端技術（修訂）");
        var updated = MakeCourseGroup(1, "雲端技術（修訂）");

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync((short)1)).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingCourseGroup_ReturnsNotFound()
    {
        var request = MakeRequest(99, "不存在");
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingCourseGroup_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync((short)1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingCourseGroup_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync((short)99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}

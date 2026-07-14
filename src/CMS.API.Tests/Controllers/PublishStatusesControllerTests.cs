using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class PublishStatusesControllerTests
{
    private readonly Mock<IPublishStatusRepository> _repository = new();
    private readonly PublishStatusesController _controller;

    public PublishStatusesControllerTests()
    {
        _controller = new PublishStatusesController(_repository.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithAllStatuses()
    {
        var statuses = new List<PublishStatus>
        {
            new() { Pkid = 1, Description = "草稿", IsDraft = true },
            new() { Pkid = 2, Description = "已發布", IsPublished = true }
        };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(statuses);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(statuses, okResult.Value);
    }

    [Fact]
    public async Task Query_WithKeyword_ReturnsFilteredStatuses()
    {
        var query = new PublishStatusQuery { Keyword = "草稿", IsDraft = true };
        var statuses = new List<PublishStatus>
        {
            new() { Pkid = 1, Description = "草稿", IsDraft = true }
        };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(statuses);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(statuses, okResult.Value);
    }

    [Fact]
    public async Task GetById_ExistingStatus_ReturnsOk()
    {
        var status = new PublishStatus { Pkid = 1, Description = "草稿", IsDraft = true };
        _repository.Setup(r => r.GetByIdAsync((byte)1)).ReturnsAsync(status);

        var result = await _controller.GetById(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(status, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingStatus_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync((byte)99)).ReturnsAsync((PublishStatus?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewStatus_ReturnsCreatedAtAction()
    {
        var request = new PublishStatusRequest { Pkid = 3, Description = "已下架", IsDiscontinued = true };
        var created = new PublishStatus { Pkid = 3, Description = "已下架", IsDiscontinued = true };

        _repository.Setup(r => r.ExistsAsync((byte)3)).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).Returns(Task.CompletedTask);
        _repository.Setup(r => r.GetByIdAsync((byte)3)).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_DuplicatePkid_ReturnsConflict()
    {
        var request = new PublishStatusRequest { Pkid = 1, Description = "草稿", IsDraft = true };
        _repository.Setup(r => r.ExistsAsync((byte)1)).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result.Result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<PublishStatusRequest>()), Times.Never);
    }

    [Fact]
    public async Task Update_ExistingStatus_ReturnsOk()
    {
        var request = new PublishStatusRequest { Pkid = 1, Description = "草稿（修訂）", IsDraft = true };
        var updated = new PublishStatus { Pkid = 1, Description = "草稿（修訂）", IsDraft = true };

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync((byte)1)).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingStatus_ReturnsNotFound()
    {
        var request = new PublishStatusRequest { Pkid = 99, Description = "不存在" };
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingStatus_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync((byte)1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingStatus_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync((byte)99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}

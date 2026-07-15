using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class RowAuditControllerTests
{
    private readonly Mock<IRowAuditRepository> _repository = new();
    private readonly RowAuditController _controller;

    public RowAuditControllerTests()
    {
        _controller = new RowAuditController(_repository.Object);
    }

    private static RowAuditEntry Entry(DateTime dateTime, string userName, string actionType) => new()
    {
        DateTime = dateTime,
        UserName = userName,
        ActionType = actionType,
        ActionDesc = "Title"
    };

    [Fact]
    public async Task Get_FiltersByTableNameAndPkid_ReturnsRowsNewestFirst()
    {
        var newer = Entry(new DateTime(2026, 6, 4, 14, 30, 0), "alice", "Update");
        var older = Entry(new DateTime(2026, 6, 1, 9, 0, 0), "bob", "Insert");
        var trail = new List<RowAuditEntry> { newer, older };
        _repository.Setup(r => r.GetForRecordAsync("Course", "123")).ReturnsAsync(trail);

        var result = await _controller.Get("Course", "123");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IEnumerable<RowAuditEntry>>(okResult.Value).ToList();
        Assert.Equal(trail, returned);
        // Newest first is preserved end to end.
        Assert.Equal("alice", returned[0].UserName);
        _repository.Verify(r => r.GetForRecordAsync("Course", "123"), Times.Once);
    }

    [Fact]
    public async Task Get_MissingTableName_ReturnsBadRequest()
    {
        var result = await _controller.Get("", "123");

        Assert.IsType<BadRequestResult>(result.Result);
        _repository.Verify(r => r.GetForRecordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Get_MissingPkid_ReturnsBadRequest()
    {
        var result = await _controller.Get("Course", "");

        Assert.IsType<BadRequestResult>(result.Result);
        _repository.Verify(r => r.GetForRecordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}

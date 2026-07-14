using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class PartnersControllerTests
{
    private readonly Mock<IPartnerRepository> _repository = new();
    private readonly PartnersController _controller;

    public PartnersControllerTests()
    {
        _controller = new PartnersController(_repository.Object);
    }

    private static Partner MakePartner(short pkid, string name) => new()
    {
        Pkid = pkid,
        Name = name,
        AppKey = "MS",
        NameOnPartnerMenu = $"{name} 課程",
        NameOnCourseDetailPage = name,
        DisplayOrder = 1
    };

    private static PartnerRequest MakeRequest(short pkid, string name) => new()
    {
        Pkid = pkid,
        Name = name,
        AppKey = "MS",
        NameOnPartnerMenu = $"{name} 課程",
        NameOnCourseDetailPage = name,
        DisplayOrder = 1
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithAllPartners()
    {
        var partners = new List<Partner> { MakePartner(1, "Microsoft"), MakePartner(2, "AWS") };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(partners);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(partners, okResult.Value);
    }

    [Fact]
    public async Task Query_WithKeyword_ReturnsFilteredPartners()
    {
        var query = new PartnerQuery { Keyword = "Micro" };
        var partners = new List<Partner> { MakePartner(1, "Microsoft") };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(partners);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(partners, okResult.Value);
    }

    [Fact]
    public async Task GetById_ExistingPartner_ReturnsOk()
    {
        var partner = MakePartner(1, "Microsoft");
        _repository.Setup(r => r.GetByIdAsync((short)1)).ReturnsAsync(partner);

        var result = await _controller.GetById(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(partner, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingPartner_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync((short)99)).ReturnsAsync((Partner?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewPartner_ReturnsCreatedAtActionWithGeneratedPkid()
    {
        // pkid is IDENTITY: the caller sends 0 and the repository hands back the DB-generated key.
        var request = MakeRequest(0, "AWS");
        var created = MakePartner(7, "AWS");

        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync((short)7);
        _repository.Setup(r => r.GetByIdAsync((short)7)).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        Assert.Equal((short)7, createdResult.RouteValues!["id"]);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Update_ExistingPartner_ReturnsOk()
    {
        var request = MakeRequest(1, "Microsoft（修訂）");
        var updated = MakePartner(1, "Microsoft（修訂）");

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync((short)1)).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingPartner_ReturnsNotFound()
    {
        var request = MakeRequest(99, "不存在");
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingPartner_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync((short)1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingPartner_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync((short)99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}

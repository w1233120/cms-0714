using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class FeaturedPromoItemsControllerTests
{
    private readonly Mock<IFeaturedPromoItemRepository> _repository = new();
    private readonly FeaturedPromoItemsController _controller;

    public FeaturedPromoItemsControllerTests()
    {
        _controller = new FeaturedPromoItemsController(_repository.Object);
    }

    private static FeaturedPromoItem MakeItem(int pkid, byte slot, string promoCode = "20251204_SkillTrainAI") => new()
    {
        Pkid = pkid,
        ScheduleOn = new DateOnly(2026, 3, 16),
        TrainingCenterPkid = 1,
        Slot = slot,
        PromotionPkid = 42,
        PromoCode = promoCode,
        Topic = "成為能AI協作的程式設計師",
        Description = "轉職就業養成班，三大主流語言任你選"
    };

    private static FeaturedPromoItemRequest MakeRequest(int pkid, byte slot) => new()
    {
        Pkid = pkid,
        ScheduleOn = new DateOnly(2026, 3, 16),
        TrainingCenterPkid = 1,
        Slot = slot,
        PromotionPkid = 42,
        Topic = "成為能AI協作的程式設計師",
        Description = "轉職就業養成班，三大主流語言任你選"
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithAllItems()
    {
        var items = new List<FeaturedPromoItem> { MakeItem(1, 1), MakeItem(2, 2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(items);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(items, okResult.Value);
    }

    [Fact]
    public async Task Query_WithTrainingCenterAndOneWeekWindow_ReturnsFilteredItems()
    {
        // 台北 (pkid 1), Monday 3/16 through Sunday 3/22.
        var query = new FeaturedPromoItemQuery
        {
            TrainingCenterPkid = 1,
            ScheduleOnFrom = new DateOnly(2026, 3, 16),
            ScheduleOnTo = new DateOnly(2026, 3, 22)
        };
        var items = new List<FeaturedPromoItem> { MakeItem(1, 1), MakeItem(2, 2) };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(items);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(items, okResult.Value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_ExistingItem_ReturnsOk()
    {
        var item = MakeItem(1, 1);
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(item);

        var result = await _controller.GetById(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(item, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingItem_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((FeaturedPromoItem?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewItem_ReturnsCreatedAtActionWithGeneratedPkid()
    {
        var request = MakeRequest(0, 1);
        var created = MakeItem(7, 1);

        _repository
            .Setup(r => r.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
            .ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        Assert.Equal(7, createdResult.RouteValues!["id"]);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_DuplicateDateCenterSlot_ReturnsConflict()
    {
        var request = MakeRequest(0, 1);
        _repository
            .Setup(r => r.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
            .ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result.Result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<FeaturedPromoItemRequest>()), Times.Never);
    }

    [Fact]
    public async Task Update_ExistingItem_ReturnsOk()
    {
        var request = MakeRequest(1, 1);
        var updated = MakeItem(1, 1, "251211_GoogleAI");

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingItem_ReturnsNotFound()
    {
        var request = MakeRequest(99, 1);
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task SwapSlots_BothExist_ReturnsOk()
    {
        var request = new SwapSlotsRequest { PkidA = 1, PkidB = 2 };
        _repository.Setup(r => r.SwapSlotsAsync(1, 2)).ReturnsAsync(true);

        var result = await _controller.SwapSlots(request);

        Assert.IsType<OkResult>(result);
        _repository.Verify(r => r.SwapSlotsAsync(1, 2), Times.Once);
    }

    [Fact]
    public async Task SwapSlots_MissingItem_ReturnsNotFound()
    {
        var request = new SwapSlotsRequest { PkidA = 1, PkidB = 99 };
        _repository.Setup(r => r.SwapSlotsAsync(1, 99)).ReturnsAsync(false);

        var result = await _controller.SwapSlots(request);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingItem_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingItem_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}

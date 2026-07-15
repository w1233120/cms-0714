using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class LookupsControllerTests
{
    private readonly Mock<ILookupRepository> _repository = new();
    private readonly LookupsController _controller;

    public LookupsControllerTests()
    {
        _controller = new LookupsController(_repository.Object);
    }

    [Fact]
    public async Task GetTrainingCenters_ReturnsOkWithTabs()
    {
        var centers = new List<TrainingCenterLookup>
        {
            new() { Pkid = 1, Name = "台北" },
            new() { Pkid = 2, Name = "新竹" }
        };
        _repository.Setup(r => r.GetTrainingCentersAsync()).ReturnsAsync(centers);

        var result = await _controller.GetTrainingCenters();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(centers, okResult.Value);
    }

    [Fact]
    public async Task GetPromotions_ReturnsOkWithPromoCodeLookup()
    {
        // The FeaturedPromoItem form resolves a typed PromoCode to Promotion_pkid via this lookup.
        var promotions = new List<PromotionLookup>
        {
            new() { Pkid = 42, PromoCode = "20251204_SkillTrainAI", Topic = "成為能AI協作的程式設計師", Description = "轉職就業養成班" },
            new() { Pkid = 43, PromoCode = "251211_GoogleAI", Topic = "Google AI工具一次掌握", Description = "不需技術基礎" }
        };
        _repository.Setup(r => r.GetPromotionsAsync()).ReturnsAsync(promotions);

        var result = await _controller.GetPromotions();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(promotions, okResult.Value);
        _repository.Verify(r => r.GetPromotionsAsync(), Times.Once);
    }
}

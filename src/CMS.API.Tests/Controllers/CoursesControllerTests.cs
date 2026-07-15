using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class CoursesControllerTests
{
    private readonly Mock<ICourseRepository> _repository = new();
    private readonly CoursesController _controller;

    public CoursesControllerTests()
    {
        _controller = new CoursesController(_repository.Object);
    }

    private static Course MakeCourse(int pkid, string courseId) => new()
    {
        Pkid = pkid,
        Title = "AI 協作開發實戰",
        CourseId = courseId,
        ProdCourseId = $"{courseId}-P",
        FriendlyUrl = courseId.ToLowerInvariant(),
        DisplayOrder = 1,
        PartnerPkid = 1,
        CourseGroupPkid = 2,
        PublishStatusPkid = 2,
        ScheduleOn = new DateOnly(2026, 3, 16),
        ScheduleOff = new DateOnly(2026, 12, 31),
        Hour = 24,
        ListPrice = 12000m,
        LearningCredit = 2.5m,
        CanRepeat = false,
        PartnerName = "Microsoft",
        CourseGroupDescription = "AI",
        PublishStatusDescription = "已發布"
    };

    private static CourseRequest MakeRequest(int pkid, string courseId) => new()
    {
        Pkid = pkid,
        Title = "AI 協作開發實戰",
        CourseId = courseId,
        ProdCourseId = $"{courseId}-P",
        FriendlyUrl = courseId.ToLowerInvariant(),
        DisplayOrder = 1,
        PartnerPkid = 1,
        CourseGroupPkid = 2,
        PublishStatusPkid = 2,
        ScheduleOn = new DateOnly(2026, 3, 16),
        ScheduleOff = new DateOnly(2026, 12, 31),
        Hour = 24,
        ListPrice = 12000m,
        LearningCredit = 2.5m,
        CanRepeat = false
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithAllCourses()
    {
        var courses = new List<Course> { MakeCourse(1, "AI-101"), MakeCourse(2, "AI-102") };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(courses);

        var result = await _controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(courses, okResult.Value);
    }

    [Fact]
    public async Task Query_WithFilters_ReturnsFilteredCourses()
    {
        var query = new CourseQuery
        {
            Keyword = "AI",
            PartnerPkid = 1,
            PublishStatusPkid = 2,
            ScheduleOnFrom = new DateOnly(2026, 1, 1),
            ScheduleOnTo = new DateOnly(2026, 12, 31),
            CanRepeat = false
        };
        var courses = new List<Course> { MakeCourse(1, "AI-101") };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync(courses);

        var result = await _controller.Query(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(courses, okResult.Value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_ExistingCourse_ReturnsOk()
    {
        var course = MakeCourse(1, "AI-101");
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(course);

        var result = await _controller.GetById(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(course, okResult.Value);
    }

    [Fact]
    public async Task GetById_MissingCourse_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Course?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_NewCourse_ReturnsCreatedAtActionWithGeneratedPkid()
    {
        var request = MakeRequest(0, "AI-101");
        var created = MakeCourse(7, "AI-101");

        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(created);

        var result = await _controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(created, createdResult.Value);
        Assert.Equal(7, createdResult.RouteValues!["id"]);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Update_ExistingCourse_ReturnsOk()
    {
        var request = MakeRequest(1, "AI-101");
        var updated = MakeCourse(1, "AI-101");

        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(updated);

        var result = await _controller.Update(request);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updated, okResult.Value);
    }

    [Fact]
    public async Task Update_MissingCourse_ReturnsNotFound()
    {
        var request = MakeRequest(99, "NOPE");
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingCourse_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_MissingCourse_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}

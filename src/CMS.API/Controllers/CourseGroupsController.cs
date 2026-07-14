using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/coursegroups")]
public class CourseGroupsController(ICourseGroupRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CourseGroup>>> GetAll()
    {
        return Ok(await repository.GetAllAsync());
    }

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<CourseGroup>>> Query([FromBody] CourseGroupQuery query)
    {
        return Ok(await repository.QueryAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CourseGroup>> GetById(short id)
    {
        var courseGroup = await repository.GetByIdAsync(id);
        return courseGroup is null ? NotFound() : Ok(courseGroup);
    }

    [HttpPost]
    public async Task<ActionResult<CourseGroup>> Create([FromBody] CourseGroupRequest request)
    {
        var pkid = await repository.CreateAsync(request);
        var created = await repository.GetByIdAsync(pkid);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, created);
    }

    [HttpPut]
    public async Task<ActionResult<CourseGroup>> Update([FromBody] CourseGroupRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(await repository.GetByIdAsync(request.Pkid));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(short id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

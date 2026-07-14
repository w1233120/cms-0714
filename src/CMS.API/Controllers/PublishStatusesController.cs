using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/publishstatuses")]
public class PublishStatusesController(IPublishStatusRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublishStatus>>> GetAll()
    {
        return Ok(await repository.GetAllAsync());
    }

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<PublishStatus>>> Query([FromBody] PublishStatusQuery query)
    {
        return Ok(await repository.QueryAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PublishStatus>> GetById(byte id)
    {
        var status = await repository.GetByIdAsync(id);
        return status is null ? NotFound() : Ok(status);
    }

    [HttpPost]
    public async Task<ActionResult<PublishStatus>> Create([FromBody] PublishStatusRequest request)
    {
        if (await repository.ExistsAsync(request.Pkid))
        {
            return Conflict($"PublishStatus with pkid '{request.Pkid}' already exists.");
        }

        await repository.CreateAsync(request);
        var created = await repository.GetByIdAsync(request.Pkid);
        return CreatedAtAction(nameof(GetById), new { id = request.Pkid }, created);
    }

    [HttpPut]
    public async Task<ActionResult<PublishStatus>> Update([FromBody] PublishStatusRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(await repository.GetByIdAsync(request.Pkid));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(byte id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

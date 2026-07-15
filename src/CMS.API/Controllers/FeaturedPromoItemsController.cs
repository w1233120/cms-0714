using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/featuredpromoitems")]
public class FeaturedPromoItemsController(IFeaturedPromoItemRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeaturedPromoItem>>> GetAll()
    {
        return Ok(await repository.GetAllAsync());
    }

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<FeaturedPromoItem>>> Query([FromBody] FeaturedPromoItemQuery query)
    {
        return Ok(await repository.QueryAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FeaturedPromoItem>> GetById(int id)
    {
        var item = await repository.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<FeaturedPromoItem>> Create([FromBody] FeaturedPromoItemRequest request)
    {
        if (await repository.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
        {
            return Conflict(
                $"A featured promo item already exists for {request.ScheduleOn:yyyy-MM-dd}, " +
                $"training center {request.TrainingCenterPkid}, slot {request.Slot}.");
        }

        var pkid = await repository.CreateAsync(request);
        var created = await repository.GetByIdAsync(pkid);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, created);
    }

    [HttpPut]
    public async Task<ActionResult<FeaturedPromoItem>> Update([FromBody] FeaturedPromoItemRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(await repository.GetByIdAsync(request.Pkid));
    }

    // Moves a slot up/down by swapping two rows' Slot values (see spec: +/- buttons).
    [HttpPost("swap")]
    public async Task<IActionResult> SwapSlots([FromBody] SwapSlotsRequest request)
    {
        var swapped = await repository.SwapSlotsAsync(request.PkidA, request.PkidB);
        return swapped ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

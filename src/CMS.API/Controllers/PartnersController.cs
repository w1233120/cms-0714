using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/partners")]
public class PartnersController(IPartnerRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Partner>>> GetAll()
    {
        return Ok(await repository.GetAllAsync());
    }

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<Partner>>> Query([FromBody] PartnerQuery query)
    {
        return Ok(await repository.QueryAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Partner>> GetById(short id)
    {
        var partner = await repository.GetByIdAsync(id);
        return partner is null ? NotFound() : Ok(partner);
    }

    [HttpPost]
    public async Task<ActionResult<Partner>> Create([FromBody] PartnerRequest request)
    {
        var pkid = await repository.CreateAsync(request);
        var created = await repository.GetByIdAsync(pkid);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, created);
    }

    [HttpPut]
    public async Task<ActionResult<Partner>> Update([FromBody] PartnerRequest request)
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

using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/appusers")]
public class AppUsersController(IAppUserRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppUser>>> GetAll()
    {
        return Ok(await repository.GetAllAsync());
    }

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<AppUser>>> Query([FromBody] AppUserQuery query)
    {
        return Ok(await repository.QueryAsync(query));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AppUser>> GetById(string id)
    {
        var user = await repository.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<AppUser>> Create([FromBody] AppUserRequest request)
    {
        if (await repository.ExistsAsync(request.UserId))
        {
            return Conflict($"AppUser with UserId '{request.UserId}' already exists.");
        }

        await repository.CreateAsync(request);
        var created = await repository.GetByIdAsync(request.UserId);
        return CreatedAtAction(nameof(GetById), new { id = request.UserId }, created);
    }

    [HttpPut]
    public async Task<ActionResult<AppUser>> Update([FromBody] AppUserRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(await repository.GetByIdAsync(request.UserId));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // Resets the target user's password back to the system default. Admin-only: the global
    // fallback policy already requires authentication, and this attribute additionally
    // requires the "Admin" role, so a non-Admin caller gets 403 (not just a hidden button).
    // No password or hash ever crosses the wire — the body is empty and only success/failure
    // is returned.
    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(string id)
    {
        var reset = await repository.ResetPasswordAsync(id);
        return reset ? NoContent() : NotFound();
    }
}

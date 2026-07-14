using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/lookups")]
public class LookupsController(ILookupRepository repository) : ControllerBase
{
    [HttpGet("app-users")]
    public async Task<ActionResult<IEnumerable<AppUserLookup>>> GetAppUsers()
    {
        return Ok(await repository.GetAppUsersAsync());
    }

    [HttpGet("app-roles")]
    public async Task<ActionResult<IEnumerable<AppRoleLookup>>> GetAppRoles()
    {
        return Ok(await repository.GetAppRolesAsync());
    }

    [HttpGet("publish-statuses")]
    public async Task<ActionResult<IEnumerable<PublishStatusLookup>>> GetPublishStatuses()
    {
        return Ok(await repository.GetPublishStatusesAsync());
    }

    [HttpGet("partners")]
    public async Task<ActionResult<IEnumerable<PartnerLookup>>> GetPartners()
    {
        return Ok(await repository.GetPartnersAsync());
    }

    [HttpGet("course-groups")]
    public async Task<ActionResult<IEnumerable<CourseGroupLookup>>> GetCourseGroups()
    {
        return Ok(await repository.GetCourseGroupsAsync());
    }
}

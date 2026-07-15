using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/rowaudit")]
public class RowAuditController(IRowAuditRepository repository) : ControllerBase
{
    // The audit trail for one business record, newest first. tableName + pkid together
    // identify the record — they are how RowAuditWriter stamped every row it wrote.
    // e.g. GET /api/rowaudit?tableName=Course&pkid=123
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RowAuditEntry>>> Get(
        [FromQuery] string tableName, [FromQuery] string pkid)
    {
        if (string.IsNullOrWhiteSpace(tableName) || string.IsNullOrWhiteSpace(pkid))
        {
            return BadRequest();
        }

        return Ok(await repository.GetForRecordAsync(tableName, pkid));
    }
}

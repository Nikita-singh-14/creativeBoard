using CreativeBoard.Api.Data;
using CreativeBoard.Api.Dtos;
using CreativeBoard.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreativeBoard.Api.Controllers;

[ApiController]
[Route("api/summary")]
public sealed class SummaryController(AppDbContext db) : ControllerBase
{
    /// <summary>Returns persisted project and idea totals.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SummaryDto>> Get(CancellationToken cancellationToken)
    {
        var projects = await db.Projects.CountAsync(cancellationToken);
        var ideas = await db.Ideas.CountAsync(cancellationToken);
        var approved = await db.Ideas.CountAsync(i => i.Stage == IdeaStage.Approved, cancellationToken);
        return Ok(new SummaryDto(projects, ideas, approved));
    }
}

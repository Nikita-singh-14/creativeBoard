using CreativeBoard.Api.Data;
using CreativeBoard.Api.Dtos;
using CreativeBoard.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreativeBoard.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int:min(1)}/ideas")]
public sealed class IdeasController(AppDbContext db) : ControllerBase
{
    /// <summary>Lists a project's ideas, optionally filtered by stage.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<IdeaResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<IdeaResponseDto>>> List(int projectId, [FromQuery] string? stage, CancellationToken cancellationToken)
    {
        if (!await db.Projects.AnyAsync(p => p.Id == projectId, cancellationToken)) return NotFound();
        var query = db.Ideas.AsNoTracking().Where(i => i.ProjectId == projectId);
        if (!string.IsNullOrWhiteSpace(stage))
        {
            if (!Enum.TryParse<IdeaStage>(stage, true, out var parsed) ||
                !Enum.IsDefined(parsed) ||
                !string.Equals(Enum.GetName(parsed), stage, StringComparison.OrdinalIgnoreCase))
                return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["stage"] = ["Stage is not valid."] }));
            query = query.Where(i => i.Stage == parsed);
        }
        return Ok(await query.OrderByDescending(i => i.CreatedAt).Select(i => i.ToDto()).ToListAsync(cancellationToken));
    }

    /// <summary>Creates an idea in a project.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IdeaResponseDto>> Create(int projectId, IdeaCreateDto request, CancellationToken cancellationToken)
    {
        if (!await db.Projects.AnyAsync(p => p.Id == projectId, cancellationToken)) return NotFound();
        if (!Enum.IsDefined(request.Stage))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["stage"] = ["Stage is not valid."] }));
        var idea = new Idea
        {
            ProjectId = projectId,
            Title = request.Title,
            ImageUrl = request.ImageUrl,
            Note = request.Note,
            Stage = request.Stage,
            CreatedAt = DateTime.UtcNow
        };
        db.Ideas.Add(idea);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (!await db.Projects.AnyAsync(p => p.Id == projectId, cancellationToken)) return NotFound();
            throw;
        }
        return Created($"/api/projects/{projectId}/ideas/{idea.Id}", idea.ToDto());
    }

    /// <summary>Replaces editable fields on an idea.</summary>
    [HttpPut("{ideaId:int:min(1)}")]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IdeaResponseDto>> Update(int projectId, int ideaId, IdeaUpdateDto request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Stage))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["stage"] = ["Stage is not valid."] }));
        var idea = await db.Ideas.SingleOrDefaultAsync(i => i.Id == ideaId && i.ProjectId == projectId, cancellationToken);
        if (idea is null) return NotFound();
        idea.Title = request.Title;
        idea.ImageUrl = request.ImageUrl;
        idea.Note = request.Note;
        idea.Stage = request.Stage;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return NotFound();
        }
        return Ok(idea.ToDto());
    }

    /// <summary>Changes only the stage of an idea.</summary>
    [HttpPatch("{ideaId:int:min(1)}/stage")]
    [ProducesResponseType(typeof(IdeaResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IdeaResponseDto>> UpdateStage(int projectId, int ideaId, IdeaStageUpdateDto request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Stage))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["stage"] = ["Stage is not valid."] }));
        var idea = await db.Ideas.SingleOrDefaultAsync(i => i.Id == ideaId && i.ProjectId == projectId, cancellationToken);
        if (idea is null) return NotFound();
        idea.Stage = request.Stage;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return NotFound();
        }
        return Ok(idea.ToDto());
    }

    /// <summary>Deletes an idea.</summary>
    [HttpDelete("{ideaId:int:min(1)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int projectId, int ideaId, CancellationToken cancellationToken)
    {
        var deleted = await db.Ideas.Where(i => i.Id == ideaId && i.ProjectId == projectId).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0 ? NotFound() : NoContent();
    }
}

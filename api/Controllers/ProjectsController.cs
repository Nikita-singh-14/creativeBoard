using CreativeBoard.Api.Data;
using CreativeBoard.Api.Dtos;
using CreativeBoard.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreativeBoard.Api.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(AppDbContext db) : ControllerBase
{
    /// <summary>Lists projects with idea counts, optionally filtered by name and status.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ProjectResponseDto>>> List(
        [FromQuery] string? search, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var query = db.Projects.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ProjectStatus>(status, true, out var parsed) ||
                !Enum.IsDefined(parsed) ||
                !string.Equals(Enum.GetName(parsed), status, StringComparison.OrdinalIgnoreCase))
                return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["status"] = ["Status is not valid."] }));
            query = query.Where(p => p.Status == parsed);
        }
        var term = search?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            term = term[..Math.Min(term.Length, 100)];
            var escaped = term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
            query = query.Where(p => EF.Functions.Like(p.Name, $"%{escaped}%", "\\"));
        }

        var projects = await query.OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectResponseDto(
                p.Id, p.Name, p.Description, p.CoverImageUrl, p.Status, p.DueDate, p.CreatedAt,
                p.Ideas.Count, p.Ideas.Count(i => i.Stage == IdeaStage.Approved)))
            .ToListAsync(cancellationToken);
        return Ok(projects);
    }

    /// <summary>Gets one project and its idea counts.</summary>
    [HttpGet("{id:int:min(1)}")]
    [ProducesResponseType(typeof(ProjectResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectResponseDto>> Get(int id, CancellationToken cancellationToken)
    {
        var project = await db.Projects.AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProjectResponseDto(
                p.Id, p.Name, p.Description, p.CoverImageUrl, p.Status, p.DueDate, p.CreatedAt,
                p.Ideas.Count, p.Ideas.Count(i => i.Stage == IdeaStage.Approved)))
            .SingleOrDefaultAsync(cancellationToken);
        return project is null ? NotFound() : Ok(project);
    }

    /// <summary>Creates a project.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProjectResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectResponseDto>> Create(ProjectCreateDto request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Status))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["status"] = ["Status is not valid."] }));
        InputRules.TryDueDate(request.DueDate, out var dueDate);
        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            CoverImageUrl = request.CoverImageUrl,
            Status = request.Status,
            DueDate = dueDate,
            CreatedAt = DateTime.UtcNow
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = project.Id }, project.ToDto(0, 0));
    }

    /// <summary>Replaces editable project fields.</summary>
    [HttpPut("{id:int:min(1)}")]
    [ProducesResponseType(typeof(ProjectResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectResponseDto>> Update(int id, ProjectUpdateDto request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Status))
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]> { ["status"] = ["Status is not valid."] }));
        var project = await db.Projects.Include(p => p.Ideas).SingleOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (project is null) return NotFound();
        InputRules.TryDueDate(request.DueDate, out var dueDate);
        project.Name = request.Name;
        project.Description = request.Description;
        project.CoverImageUrl = request.CoverImageUrl;
        project.Status = request.Status;
        project.DueDate = dueDate;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return NotFound();
        }
        return Ok(project.ToDto(project.Ideas.Count, project.Ideas.Count(i => i.Stage == IdeaStage.Approved)));
    }

    /// <summary>Deletes a project and all of its ideas.</summary>
    [HttpDelete("{id:int:min(1)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await db.Projects.Where(p => p.Id == id).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0 ? NotFound() : NoContent();
    }
}

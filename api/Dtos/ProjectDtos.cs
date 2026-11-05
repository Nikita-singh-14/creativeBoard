using System.ComponentModel.DataAnnotations;
using CreativeBoard.Api.Models;

namespace CreativeBoard.Api.Dtos;

public sealed class ProjectCreateDto : ProjectWriteDto { }
public sealed class ProjectUpdateDto : ProjectWriteDto { }

public abstract class ProjectWriteDto : IValidatableObject
{
    private string _name = "";
    private string _description = "";
    private string? _coverImageUrl;
    private string? _dueDate;

    [Required(ErrorMessage = "Project name is required.")]
    [StringLength(100, ErrorMessage = "Name must be 100 characters or fewer.")]
    public string Name { get => _name; set => _name = InputRules.Clean(value); }

    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or fewer.")]
    public string Description { get => _description; set => _description = InputRules.Clean(value); }

    [StringLength(2048, ErrorMessage = "Image URL must be 2048 characters or fewer.")]
    public string? CoverImageUrl { get => _coverImageUrl; set => _coverImageUrl = InputRules.CleanOptionalUrl(value); }

    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;

    public string? DueDate { get => _dueDate; set => _dueDate = InputRules.CleanOptionalUrl(value); }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!InputRules.IsHttpUrl(CoverImageUrl))
            yield return new ValidationResult("Image URL must be an absolute http or https URL.", [nameof(CoverImageUrl)]);
        if (!InputRules.TryDueDate(DueDate, out _))
            yield return new ValidationResult("Due date must be a valid ISO date between 2000 and 2100.", [nameof(DueDate)]);
    }
}

public sealed record ProjectResponseDto(
    int Id,
    string Name,
    string Description,
    string? CoverImageUrl,
    ProjectStatus Status,
    DateOnly? DueDate,
    DateTime CreatedAt,
    int IdeaCount,
    int ApprovedCount);

public sealed record SummaryDto(int TotalProjects, int TotalIdeas, int ApprovedIdeas);

public static class ProjectMapping
{
    public static ProjectResponseDto ToDto(this Project p, int ideaCount, int approvedCount) =>
        new(p.Id, p.Name, p.Description, p.CoverImageUrl, p.Status, p.DueDate, p.CreatedAt, ideaCount, approvedCount);
}

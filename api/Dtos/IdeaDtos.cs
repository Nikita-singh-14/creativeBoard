using System.ComponentModel.DataAnnotations;
using CreativeBoard.Api.Models;

namespace CreativeBoard.Api.Dtos;

public sealed class IdeaCreateDto : IdeaWriteDto { }
public sealed class IdeaUpdateDto : IdeaWriteDto { }

public abstract class IdeaWriteDto : IValidatableObject
{
    private string _title = "";
    private string? _imageUrl;
    private string _note = "";

    [Required(ErrorMessage = "Idea title is required.")]
    [StringLength(120, ErrorMessage = "Title must be 120 characters or fewer.")]
    public string Title { get => _title; set => _title = InputRules.Clean(value); }

    [StringLength(2048, ErrorMessage = "Image URL must be 2048 characters or fewer.")]
    public string? ImageUrl { get => _imageUrl; set => _imageUrl = InputRules.CleanOptionalUrl(value); }

    [StringLength(500, ErrorMessage = "Note must be 500 characters or fewer.")]
    public string Note { get => _note; set => _note = InputRules.Clean(value); }

    public IdeaStage Stage { get; set; } = IdeaStage.Idea;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!InputRules.IsHttpUrl(ImageUrl))
            yield return new ValidationResult("Image URL must be an absolute http or https URL.", [nameof(ImageUrl)]);
    }
}

public sealed class IdeaStageUpdateDto
{
    public IdeaStage Stage { get; set; }
}

public sealed record IdeaResponseDto(
    int Id,
    int ProjectId,
    string Title,
    string? ImageUrl,
    string Note,
    IdeaStage Stage,
    DateTime CreatedAt);

public static class IdeaMapping
{
    public static IdeaResponseDto ToDto(this Idea idea) =>
        new(idea.Id, idea.ProjectId, idea.Title, idea.ImageUrl, idea.Note, idea.Stage, idea.CreatedAt);
}

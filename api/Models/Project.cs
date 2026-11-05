namespace CreativeBoard.Api.Models;

public sealed class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public string? CoverImageUrl { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
    public DateOnly? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<Idea> Ideas { get; set; } = [];
}

namespace CreativeBoard.Api.Models;

public sealed class Idea
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Title { get; set; }
    public string? ImageUrl { get; set; }
    public string Note { get; set; } = "";
    public IdeaStage Stage { get; set; } = IdeaStage.Idea;
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
}

using System.Net;
using System.Net.Http.Json;
using System.Text;
using CreativeBoard.Api.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace CreativeBoard.Api.Tests;

public sealed class ProjectsApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;
    private readonly ApiFactory _factory;

    public ProjectsApiTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ProjectValidationAndCascadeDeleteWork()
    {
        await ResetAsync();
        var invalid = await _client.PostAsJsonAsync("/api/projects", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var created = await _client.PostAsJsonAsync("/api/projects", new { name = "Campaign", status = "Active" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var project = await created.Content.ReadFromJsonAsync<ProjectData>();
        Assert.NotNull(project);

        var ideaResponse = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/ideas", new { title = "Moodboard" });
        Assert.Equal(HttpStatusCode.Created, ideaResponse.StatusCode);
        var idea = await ideaResponse.Content.ReadFromJsonAsync<IdeaData>();
        Assert.NotNull(idea);

        var otherResponse = await _client.PostAsJsonAsync("/api/projects", new { name = "Other project" });
        var otherProject = await otherResponse.Content.ReadFromJsonAsync<ProjectData>();
        Assert.NotNull(otherProject);
        var wrongProject = await _client.PatchAsJsonAsync($"/api/projects/{otherProject.Id}/ideas/{idea.Id}/stage", new { stage = "Approved" });
        Assert.Equal(HttpStatusCode.NotFound, wrongProject.StatusCode);

        var deleted = await _client.DeleteAsync($"/api/projects/{project.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        using var scope = _factory.Services.CreateScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<AppDbContext>().Ideas.CountAsync());
    }

    [Fact]
    public async Task SummaryAndStagePatchReflectSavedData()
    {
        await ResetAsync();
        var response = await _client.PostAsJsonAsync("/api/projects", new { name = "Saved work" });
        var project = await response.Content.ReadFromJsonAsync<ProjectData>();
        Assert.NotNull(project);
        var ideaResponse = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/ideas", new { title = "Reference" });
        var idea = await ideaResponse.Content.ReadFromJsonAsync<IdeaData>();
        Assert.NotNull(idea);
        var patch = await _client.PatchAsJsonAsync($"/api/projects/{project.Id}/ideas/{idea.Id}/stage", new { stage = "Approved" });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var summary = await _client.GetFromJsonAsync<SummaryData>("/api/summary");
        Assert.NotNull(summary);
        Assert.Equal(1, summary.TotalProjects);
        Assert.Equal(1, summary.TotalIdeas);
        Assert.Equal(1, summary.ApprovedIdeas);
    }

    [Fact]
    public async Task InvalidInputsAndUnknownRoutesReturnClientErrors()
    {
        await ResetAsync();
        var invalidUrl = await _client.PostAsJsonAsync("/api/projects", new
        {
            name = "Bad cover",
            coverImageUrl = "javascript:alert(1)"
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalidUrl.StatusCode);

        var invalidDate = await _client.PostAsJsonAsync("/api/projects", new
        {
            name = "Bad date",
            dueDate = "2101-01-01"
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalidDate.StatusCode);

        var invalidEnum = await _client.PostAsync("/api/projects",
            new StringContent("{\"name\":\"Bad status\",\"status\":99}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, invalidEnum.StatusCode);

        var malformed = await _client.PostAsync("/api/projects",
            new StringContent("{broken", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/projects/999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/projects/abc")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync("/api/projects/999")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/projects?status=Done")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/projects?status=1")).StatusCode);
        var missingRoute = await _client.GetAsync("/api/unrecognized");
        Assert.Equal(HttpStatusCode.NotFound, missingRoute.StatusCode);
        Assert.Equal("application/problem+json", missingRoute.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PostAsJsonAsync("/api/projects/999/ideas", new { title = "Orphan" })).StatusCode);
    }

    [Fact]
    public async Task SearchEscapesLikeWildcardsAndStatusFilterWorks()
    {
        await ResetAsync();
        var first = await _client.PostAsJsonAsync("/api/projects", new { name = "Campaign 100%", status = "Active" });
        var second = await _client.PostAsJsonAsync("/api/projects", new { name = "Campaign 100X", status = "Planning" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);

        var percentMatches = await _client.GetFromJsonAsync<List<ProjectData>>("/api/projects?search=%25");
        var activeMatches = await _client.GetFromJsonAsync<List<ProjectData>>("/api/projects?status=Active");
        Assert.Single(percentMatches!);
        Assert.Single(activeMatches!);
    }

    private sealed record ProjectData(int Id);
    private sealed record IdeaData(int Id);
    private sealed record SummaryData(int TotalProjects, int TotalIdeas, int ApprovedIdeas);

    private async Task ResetAsync()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Projects.ExecuteDeleteAsync();
    }
}

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly Microsoft.Data.Sqlite.SqliteConnection _connection = new("Data Source=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

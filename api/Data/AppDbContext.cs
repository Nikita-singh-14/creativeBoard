using CreativeBoard.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CreativeBoard.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Idea> Ideas => Set<Idea>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.CoverImageUrl).HasMaxLength(2048);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(x => x.DueDate).HasConversion<string>();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.Name);
            entity.HasMany(x => x.Ideas).WithOne(x => x.Project)
                .HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Idea>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(120).IsRequired();
            entity.Property(x => x.ImageUrl).HasMaxLength(2048);
            entity.Property(x => x.Note).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Stage).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.HasIndex(x => x.ProjectId);
        });
    }
}

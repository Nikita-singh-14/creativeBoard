using CreativeBoard.Api.Data;
using CreativeBoard.Api.Models;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore;

#nullable disable

namespace CreativeBoard.Api.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261105100000_InitialCreate")]
public sealed class InitialCreate : Migration
{
    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "8.0.33");
        modelBuilder.HasAnnotation("Relational:MaxIdentifierLength", 64);
        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property<int>("Id").ValueGeneratedOnAdd().HasColumnType("INTEGER")
                .HasAnnotation("Sqlite:Autoincrement", true);
            entity.Property<string>("Name").IsRequired().HasMaxLength(100).HasColumnType("TEXT");
            entity.Property<string>("Description").IsRequired().HasMaxLength(1000).HasColumnType("TEXT");
            entity.Property<string>("CoverImageUrl").HasMaxLength(2048).HasColumnType("TEXT");
            entity.Property<ProjectStatus>("Status").HasConversion<string>().IsRequired().HasMaxLength(20).HasColumnType("TEXT");
            entity.Property<DateOnly?>("DueDate").HasConversion<string>().HasColumnType("TEXT");
            entity.Property<DateTime>("CreatedAt").HasColumnType("TEXT");
            entity.HasKey("Id");
            entity.HasIndex("Name");
            entity.HasIndex("Status");
            entity.ToTable("Projects");
        });
        modelBuilder.Entity<Idea>(entity =>
        {
            entity.Property<int>("Id").ValueGeneratedOnAdd().HasColumnType("INTEGER")
                .HasAnnotation("Sqlite:Autoincrement", true);
            entity.Property<int>("ProjectId").HasColumnType("INTEGER");
            entity.Property<string>("Title").IsRequired().HasMaxLength(120).HasColumnType("TEXT");
            entity.Property<string>("ImageUrl").HasMaxLength(2048).HasColumnType("TEXT");
            entity.Property<string>("Note").IsRequired().HasMaxLength(500).HasColumnType("TEXT");
            entity.Property<IdeaStage>("Stage").HasConversion<string>().IsRequired().HasMaxLength(20).HasColumnType("TEXT");
            entity.Property<DateTime>("CreatedAt").HasColumnType("TEXT");
            entity.HasKey("Id");
            entity.HasIndex("ProjectId");
            entity.ToTable("Ideas");
        });
        modelBuilder.Entity<Idea>()
            .HasOne(x => x.Project)
            .WithMany(x => x.Ideas)
            .HasForeignKey("ProjectId")
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
    }

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Projects",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                CoverImageUrl = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: true),
                Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                DueDate = table.Column<string>(type: "TEXT", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Projects", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Ideas",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                ImageUrl = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: true),
                Note = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                Stage = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Ideas", x => x.Id);
                table.ForeignKey("FK_Ideas_Projects_ProjectId", x => x.ProjectId, "Projects", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_Projects_Name", "Projects", "Name");
        migrationBuilder.CreateIndex("IX_Projects_Status", "Projects", "Status");
        migrationBuilder.CreateIndex("IX_Ideas_ProjectId", "Ideas", "ProjectId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Ideas");
        migrationBuilder.DropTable("Projects");
    }
}

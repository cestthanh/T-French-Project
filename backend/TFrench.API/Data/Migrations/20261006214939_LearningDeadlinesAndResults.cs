using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class LearningDeadlinesAndResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsLate",
                table: "Submissions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReleasedAt",
                table: "Submissions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReleasedAt",
                table: "QuizAttempts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CutoffAt",
                table: "Assignments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OpenAt",
                table: "Assignments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AssignmentResubmissionGrants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AssignmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    StudentId = table.Column<int>(type: "INTEGER", nullable: false),
                    AttemptNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    CutoffAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    GrantedById = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignmentResubmissionGrants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssignmentResubmissionGrants_Assignments_AssignmentId",
                        column: x => x.AssignmentId,
                        principalTable: "Assignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssignmentResubmissionGrants_Users_GrantedById",
                        column: x => x.GrantedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssignmentResubmissionGrants_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentResubmissionGrants_AssignmentId_StudentId_AttemptNumber",
                table: "AssignmentResubmissionGrants",
                columns: new[] { "AssignmentId", "StudentId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentResubmissionGrants_GrantedById",
                table: "AssignmentResubmissionGrants",
                column: "GrantedById");

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentResubmissionGrants_StudentId",
                table: "AssignmentResubmissionGrants",
                column: "StudentId");
            // Preserve visibility of previously graded historical results.
            migrationBuilder.Sql("UPDATE Submissions SET ReleasedAt = COALESCE(GradedAt, SubmittedAt) WHERE Grade IS NOT NULL;");
            migrationBuilder.Sql("UPDATE QuizAttempts SET ReleasedAt = COALESCE(SubmittedAt, StartedAt) WHERE Status = 3;");
            migrationBuilder.Sql("UPDATE Submissions SET IsLate = 1 WHERE EXISTS (SELECT 1 FROM Assignments a WHERE a.Id = Submissions.AssignmentId AND julianday(Submissions.SubmittedAt) > julianday(a.DueDate));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssignmentResubmissionGrants");

            migrationBuilder.DropColumn(
                name: "IsLate",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ReleasedAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ReleasedAt",
                table: "QuizAttempts");

            migrationBuilder.DropColumn(
                name: "CutoffAt",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "OpenAt",
                table: "Assignments");
        }
    }
}

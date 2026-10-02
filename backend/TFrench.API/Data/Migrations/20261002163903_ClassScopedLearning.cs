using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class ClassScopedLearning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ClassId",
                table: "Resources",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClassId",
                table: "Assignments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Resources_ClassId",
                table: "Resources",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_ClassId",
                table: "Assignments",
                column: "ClassId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignments_CourseClasses_ClassId",
                table: "Assignments",
                column: "ClassId",
                principalTable: "CourseClasses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Resources_CourseClasses_ClassId",
                table: "Resources",
                column: "ClassId",
                principalTable: "CourseClasses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assignments_CourseClasses_ClassId",
                table: "Assignments");

            migrationBuilder.DropForeignKey(
                name: "FK_Resources_CourseClasses_ClassId",
                table: "Resources");

            migrationBuilder.DropIndex(
                name: "IX_Resources_ClassId",
                table: "Resources");

            migrationBuilder.DropIndex(
                name: "IX_Assignments_ClassId",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Resources");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Assignments");
        }
    }
}

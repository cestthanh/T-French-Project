using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Resources_Courses_CourseId",
                table: "Resources");

            migrationBuilder.RenameColumn(
                name: "FileSizeBytes",
                table: "Resources",
                newName: "IsPublic");

            migrationBuilder.AlterColumn<string>(
                name: "FileType",
                table: "Resources",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<int>(
                name: "CourseId",
                table: "Resources",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Resources",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Resources_Courses_CourseId",
                table: "Resources",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Resources_Courses_CourseId",
                table: "Resources");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Resources");

            migrationBuilder.RenameColumn(
                name: "IsPublic",
                table: "Resources",
                newName: "FileSizeBytes");

            migrationBuilder.AlterColumn<string>(
                name: "FileType",
                table: "Resources",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CourseId",
                table: "Resources",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Resources_Courses_CourseId",
                table: "Resources",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

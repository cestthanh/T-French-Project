using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFileStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FileId",
                table: "Submissions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FileUrl",
                table: "Resources",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AddColumn<int>(
                name: "FileId",
                table: "Resources",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AttachmentId",
                table: "Assignments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OriginalName = table.Column<string>(type: "TEXT", maxLength: 260, nullable: false),
                    StoredPath = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    UploadedById = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredFiles_Users_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_FileId",
                table: "Submissions",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_Resources_FileId",
                table: "Resources",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_AttachmentId",
                table: "Assignments",
                column: "AttachmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_PublicId",
                table: "StoredFiles",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_UploadedById",
                table: "StoredFiles",
                column: "UploadedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignments_StoredFiles_AttachmentId",
                table: "Assignments",
                column: "AttachmentId",
                principalTable: "StoredFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Resources_StoredFiles_FileId",
                table: "Resources",
                column: "FileId",
                principalTable: "StoredFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_StoredFiles_FileId",
                table: "Submissions",
                column: "FileId",
                principalTable: "StoredFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assignments_StoredFiles_AttachmentId",
                table: "Assignments");

            migrationBuilder.DropForeignKey(
                name: "FK_Resources_StoredFiles_FileId",
                table: "Resources");

            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_StoredFiles_FileId",
                table: "Submissions");

            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_FileId",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_Resources_FileId",
                table: "Resources");

            migrationBuilder.DropIndex(
                name: "IX_Assignments_AttachmentId",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "FileId",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "FileId",
                table: "Resources");

            migrationBuilder.DropColumn(
                name: "AttachmentId",
                table: "Assignments");

            migrationBuilder.AlterColumn<string>(
                name: "FileUrl",
                table: "Resources",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);
        }
    }
}

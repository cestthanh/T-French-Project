using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContactLeads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactLeads",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FullName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    Message = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Interest = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Note = table.Column<string>(type: "TEXT", nullable: true),
                    HandledById = table.Column<int>(type: "INTEGER", nullable: true),
                    HandledAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactLeads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactLeads_Users_HandledById",
                        column: x => x.HandledById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContactLeads_HandledById",
                table: "ContactLeads",
                column: "HandledById");

            migrationBuilder.CreateIndex(
                name: "IX_ContactLeads_Status_CreatedAt",
                table: "ContactLeads",
                columns: new[] { "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactLeads");
        }
    }
}

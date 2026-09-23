using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class LinkLeadsToEnrollments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EnrollmentId",
                table: "ContactLeads",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StudentId",
                table: "ContactLeads",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContactLeads_EnrollmentId",
                table: "ContactLeads",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactLeads_StudentId",
                table: "ContactLeads",
                column: "StudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_ContactLeads_Enrollments_EnrollmentId",
                table: "ContactLeads",
                column: "EnrollmentId",
                principalTable: "Enrollments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ContactLeads_Users_StudentId",
                table: "ContactLeads",
                column: "StudentId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContactLeads_Enrollments_EnrollmentId",
                table: "ContactLeads");

            migrationBuilder.DropForeignKey(
                name: "FK_ContactLeads_Users_StudentId",
                table: "ContactLeads");

            migrationBuilder.DropIndex(
                name: "IX_ContactLeads_EnrollmentId",
                table: "ContactLeads");

            migrationBuilder.DropIndex(
                name: "IX_ContactLeads_StudentId",
                table: "ContactLeads");

            migrationBuilder.DropColumn(
                name: "EnrollmentId",
                table: "ContactLeads");

            migrationBuilder.DropColumn(
                name: "StudentId",
                table: "ContactLeads");
        }
    }
}

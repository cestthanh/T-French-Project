using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TFrench.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseClassesAndEnrollmentStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ClassId",
                table: "Enrollments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Enrollments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "CourseClasses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CourseId = table.Column<int>(type: "INTEGER", nullable: false),
                    TeacherId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Capacity = table.Column<int>(type: "INTEGER", nullable: false),
                    Modality = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ScheduleSummary = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    LocationOrMeetingUrl = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseClasses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseClasses_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseClasses_Users_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Preserve existing installations: every current course receives a
            // default open cohort, and legacy course-level enrolments are linked
            // to it. EnrollmentStatus.Active = 0, Cancelled = 4.
            migrationBuilder.Sql(
                """
                INSERT INTO "CourseClasses"
                    ("Name", "CourseId", "TeacherId", "StartDate", "EndDate",
                     "Capacity", "Modality", "Status", "ScheduleSummary",
                     "LocationOrMeetingUrl", "CreatedAt")
                SELECT
                    'Lớp mặc định — ' || c."Title",
                    c."Id",
                    c."TeacherId",
                    c."CreatedAt",
                    NULL,
                    CASE
                        WHEN (SELECT COUNT(*) FROM "Enrollments" e WHERE e."CourseId" = c."Id") > 20
                        THEN (SELECT COUNT(*) FROM "Enrollments" e WHERE e."CourseId" = c."Id")
                        ELSE 20
                    END,
                    0,
                    1,
                    'Lớp được tạo tự động khi nâng cấp dữ liệu',
                    NULL,
                    c."CreatedAt"
                FROM "Courses" c;

                UPDATE "Enrollments"
                SET "Status" = CASE WHEN "IsActive" = 1 THEN 0 ELSE 4 END,
                    "ClassId" = (
                        SELECT cc."Id"
                        FROM "CourseClasses" cc
                        WHERE cc."CourseId" = "Enrollments"."CourseId"
                        ORDER BY cc."Id"
                        LIMIT 1
                    );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Enrollments_ClassId_StudentId",
                table: "Enrollments",
                columns: new[] { "ClassId", "StudentId" },
                unique: true,
                filter: "\"ClassId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CourseClasses_CourseId",
                table: "CourseClasses",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseClasses_TeacherId",
                table: "CourseClasses",
                column: "TeacherId");

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollments_CourseClasses_ClassId",
                table: "Enrollments",
                column: "ClassId",
                principalTable: "CourseClasses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Enrollments_CourseClasses_ClassId",
                table: "Enrollments");

            migrationBuilder.DropTable(
                name: "CourseClasses");

            migrationBuilder.DropIndex(
                name: "IX_Enrollments_ClassId_StudentId",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Enrollments");
        }
    }
}

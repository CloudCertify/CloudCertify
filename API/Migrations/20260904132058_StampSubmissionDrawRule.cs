using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <summary>
    /// Snapshot Draw Rule onto Submission at attempt start so the fold can tell a Mistakes
    /// attempt from a Drill Mix one without joining Drill (issue #84). Existing Practice rows
    /// copy the Drill they started from; Exams stay null.
    /// </summary>
    public partial class StampSubmissionDrawRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DrawRule",
                table: "Submission",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.Sql(
                @"UPDATE ""Submission"" s SET ""DrawRule"" = d.""DrawRule"" FROM ""Drill"" d WHERE s.""DrillId"" = d.""Id"";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DrawRule",
                table: "Submission");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionContentLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Submission",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "en-US");

            migrationBuilder.AddColumn<string>(
                name: "ExplanationPt",
                table: "Question",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TextPt",
                table: "Question",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TextPt",
                table: "Answer",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Language",
                table: "Submission");

            migrationBuilder.DropColumn(
                name: "ExplanationPt",
                table: "Question");

            migrationBuilder.DropColumn(
                name: "TextPt",
                table: "Question");

            migrationBuilder.DropColumn(
                name: "TextPt",
                table: "Answer");
        }
    }
}

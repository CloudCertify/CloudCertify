using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Question",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.CreateTable(
                name: "Report",
                columns: table => new
                {
                    SubmissionId = table.Column<int>(type: "integer", nullable: false),
                    QuestionId = table.Column<int>(type: "integer", nullable: false),
                    Reasons = table.Column<string[]>(type: "text[]", nullable: false),
                    Comment = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "en-US"),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "Open"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Report", x => new { x.SubmissionId, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_Report_RecordedAnswer_SubmissionId_QuestionId",
                        columns: x => new { x.SubmissionId, x.QuestionId },
                        principalTable: "RecordedAnswer",
                        principalColumns: new[] { "SubmissionId", "QuestionId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Report_QuestionId_Status",
                table: "Report",
                columns: new[] { "QuestionId", "Status" });

            // Pre-existing questions were last touched when they were seeded.
            migrationBuilder.Sql(@"UPDATE ""Question"" SET ""UpdatedAt"" = ""CreatedAt"";");

            // Stamp UpdatedAt in the database, not in SaveChanges: triage fixes Question content
            // with plain SQL (ADR 0005), and a Report older than UpdatedAt must be known stale
            // whichever path did the edit. Key/scoring columns are not content, so they are
            // deliberately outside the trigger's watch list.
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION question_touch_updated_at() RETURNS trigger AS $$
                BEGIN
                    NEW.""UpdatedAt"" = now();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER question_set_updated_at
                BEFORE UPDATE ON ""Question""
                FOR EACH ROW
                WHEN (
                    OLD.""Text"" IS DISTINCT FROM NEW.""Text""
                    OR OLD.""TextPt"" IS DISTINCT FROM NEW.""TextPt""
                    OR OLD.""Explanation"" IS DISTINCT FROM NEW.""Explanation""
                    OR OLD.""ExplanationPt"" IS DISTINCT FROM NEW.""ExplanationPt""
                    OR OLD.""Images"" IS DISTINCT FROM NEW.""Images""
                    OR OLD.""Type"" IS DISTINCT FROM NEW.""Type""
                    OR OLD.""SelectCount"" IS DISTINCT FROM NEW.""SelectCount""
                    OR OLD.""Domain"" IS DISTINCT FROM NEW.""Domain""
                    OR OLD.""Difficulty"" IS DISTINCT FROM NEW.""Difficulty""
                    OR OLD.""Concepts"" IS DISTINCT FROM NEW.""Concepts""
                    OR OLD.""ServiceCategory"" IS DISTINCT FROM NEW.""ServiceCategory""
                    OR OLD.""Services"" IS DISTINCT FROM NEW.""Services""
                )
                EXECUTE FUNCTION question_touch_updated_at();
            ");

            // An answer key or answer text edit is a content edit of its Question.
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION answer_touch_question_updated_at() RETURNS trigger AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        UPDATE ""Question"" SET ""UpdatedAt"" = now() WHERE ""Id"" = NEW.""QuestionId"";
                    ELSIF TG_OP = 'DELETE' THEN
                        UPDATE ""Question"" SET ""UpdatedAt"" = now() WHERE ""Id"" = OLD.""QuestionId"";
                    ELSE
                        -- A reparenting update changes both the old and the new Question.
                        UPDATE ""Question"" SET ""UpdatedAt"" = now()
                        WHERE ""Id"" IN (NEW.""QuestionId"", OLD.""QuestionId"");
                    END IF;
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER answer_touch_question
                AFTER INSERT OR DELETE ON ""Answer""
                FOR EACH ROW
                EXECUTE FUNCTION answer_touch_question_updated_at();

                CREATE TRIGGER answer_touch_question_on_update
                AFTER UPDATE ON ""Answer""
                FOR EACH ROW
                WHEN (
                    OLD.""Text"" IS DISTINCT FROM NEW.""Text""
                    OR OLD.""TextPt"" IS DISTINCT FROM NEW.""TextPt""
                    OR OLD.""IsCorrect"" IS DISTINCT FROM NEW.""IsCorrect""
                    OR OLD.""Image"" IS DISTINCT FROM NEW.""Image""
                    OR OLD.""QuestionId"" IS DISTINCT FROM NEW.""QuestionId""
                )
                EXECUTE FUNCTION answer_touch_question_updated_at();
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TRIGGER IF EXISTS answer_touch_question_on_update ON ""Answer"";
                DROP TRIGGER IF EXISTS answer_touch_question ON ""Answer"";
                DROP TRIGGER IF EXISTS question_set_updated_at ON ""Question"";
                DROP FUNCTION IF EXISTS answer_touch_question_updated_at();
                DROP FUNCTION IF EXISTS question_touch_updated_at();
            ");

            migrationBuilder.DropTable(
                name: "Report");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Question");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <summary>
    /// ADR 0010: Subquiz becomes Drill, Submission gains Mode. Additive on purpose — the table
    /// is renamed in place rather than dropped and recreated, so existing rows (and the
    /// Submissions pointing at them) survive. EF scaffolds this pair as a drop-and-create;
    /// it is hand-written here for that reason.
    /// </summary>
    public partial class AddSubmissionModeAndRenameSubquizToDrill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Submission_Subquiz_SubquizId", table: "Submission");
            migrationBuilder.DropForeignKey(name: "FK_Subquiz_Quiz_QuizId", table: "Subquiz");
            migrationBuilder.DropPrimaryKey(name: "PK_Subquiz", table: "Subquiz");
            migrationBuilder.DropIndex(name: "IX_Subquiz_QuizId", table: "Subquiz");

            migrationBuilder.RenameTable(name: "Subquiz", newName: "Drill");
            migrationBuilder.AddPrimaryKey(name: "PK_Drill", table: "Drill", column: "Id");
            migrationBuilder.CreateIndex(name: "IX_Drill_QuizId", table: "Drill", column: "QuizId");
            migrationBuilder.AddForeignKey(
                name: "FK_Drill_Quiz_QuizId",
                table: "Drill",
                column: "QuizId",
                principalTable: "Quiz",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // A cross-Domain Drill (Mistakes) is scoped to the whole Quiz, so Domain goes nullable.
            migrationBuilder.AlterColumn<string>(
                name: "Domain",
                table: "Drill",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            // Every shipped Subquiz was the Domain-scoped correctness draw (ADR 0008), so the
            // backfill is a blanket DrillMix. The column default is dropped afterwards: Uniform
            // is the CLR default, and a lingering database default would overwrite it on insert.
            migrationBuilder.AddColumn<string>(
                name: "DrawRule",
                table: "Drill",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "DrillMix");
            migrationBuilder.Sql(@"ALTER TABLE ""Drill"" ALTER COLUMN ""DrawRule"" DROP DEFAULT;");

            migrationBuilder.RenameColumn(name: "SubquizId", table: "Submission", newName: "DrillId");
            migrationBuilder.RenameIndex(
                name: "IX_Submission_SubquizId",
                table: "Submission",
                newName: "IX_Submission_DrillId");
            migrationBuilder.AddForeignKey(
                name: "FK_Submission_Drill_DrillId",
                table: "Submission",
                column: "DrillId",
                principalTable: "Drill",
                principalColumn: "Id");

            // Mode is now the discriminator DrillId used to be: a Submission that referenced a
            // Subquiz was a drill attempt, everything else was a full Quiz (ADR 0010).
            migrationBuilder.AddColumn<string>(
                name: "Mode",
                table: "Submission",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Exam");
            migrationBuilder.Sql(
                @"UPDATE ""Submission"" SET ""Mode"" = 'Practice' WHERE ""DrillId"" IS NOT NULL;");
            migrationBuilder.Sql(@"ALTER TABLE ""Submission"" ALTER COLUMN ""Mode"" DROP DEFAULT;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Mode", table: "Submission");

            migrationBuilder.DropForeignKey(name: "FK_Submission_Drill_DrillId", table: "Submission");
            migrationBuilder.RenameColumn(name: "DrillId", table: "Submission", newName: "SubquizId");
            migrationBuilder.RenameIndex(
                name: "IX_Submission_DrillId",
                table: "Submission",
                newName: "IX_Submission_SubquizId");

            migrationBuilder.DropColumn(name: "DrawRule", table: "Drill");

            // Rolling back cannot invent a Domain for a cross-Domain Drill, so those rows are
            // dropped rather than backfilled with a lie.
            migrationBuilder.Sql(@"DELETE FROM ""Drill"" WHERE ""Domain"" IS NULL;");
            migrationBuilder.AlterColumn<string>(
                name: "Domain",
                table: "Drill",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.DropForeignKey(name: "FK_Drill_Quiz_QuizId", table: "Drill");
            migrationBuilder.DropPrimaryKey(name: "PK_Drill", table: "Drill");
            migrationBuilder.DropIndex(name: "IX_Drill_QuizId", table: "Drill");

            migrationBuilder.RenameTable(name: "Drill", newName: "Subquiz");
            migrationBuilder.AddPrimaryKey(name: "PK_Subquiz", table: "Subquiz", column: "Id");
            migrationBuilder.CreateIndex(name: "IX_Subquiz_QuizId", table: "Subquiz", column: "QuizId");
            migrationBuilder.AddForeignKey(
                name: "FK_Subquiz_Quiz_QuizId",
                table: "Subquiz",
                column: "QuizId",
                principalTable: "Quiz",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_Submission_Subquiz_SubquizId",
                table: "Submission",
                column: "SubquizId",
                principalTable: "Subquiz",
                principalColumn: "Id");
        }
    }
}

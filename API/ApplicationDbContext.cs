using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API;

public class ApplicationDbContext: DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Quiz> Quiz { get; set; }
    public DbSet<Subquiz> Subquiz { get; set; }
    public DbSet<Question> Question { get; set; }
    public DbSet<Answer> Answer { get; set; }
    public DbSet<Submission> Submission { get; set; }
    public DbSet<RecordedAnswer> RecordedAnswer { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(q => q.Title).IsRequired().HasMaxLength(255);
            entity.Property(q => q.Description).IsRequired().HasMaxLength(255);
            entity.Property(q => q.IconName).IsRequired().HasMaxLength(255);
            entity.Property(q => q.QuizLevel).IsRequired().HasConversion<string>();
            entity.Property(q => q.QuizProvider).IsRequired().HasConversion<string>();
            entity.Property(q => q.QuestionsHash).HasMaxLength(64);
            entity.Property(q => q.CreatedAt).IsRequired();

            entity.HasMany(q => q.Questions)
                .WithOne(q => q.Quiz)
                .HasForeignKey(q => q.QuizId);

            entity.HasMany(q => q.SubQuizzes)
                .WithOne(sq => sq.Quiz)
                .HasForeignKey(sq => sq.QuizId);
        });

        modelBuilder.Entity<Subquiz>(entity =>
        {
            entity.HasKey(sq => sq.Id);
            entity.Property(sq => sq.QuizId).IsRequired();
            entity.Property(sq => sq.Title).IsRequired().HasMaxLength(255);
            entity.Property(sq => sq.Domain).IsRequired().HasMaxLength(255);
            entity.Property(sq => sq.Slug).IsRequired().HasMaxLength(255);
            entity.Property(sq => sq.IsAvailable).IsRequired().HasDefaultValue(true);
            entity.Property(sq => sq.CreatedAt).IsRequired();

            entity.HasOne(sq => sq.Quiz)
                .WithMany(q => q.SubQuizzes)
                .HasForeignKey(sq => sq.QuizId);
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(q => q.Text).HasColumnType("text");
            entity.Property(q => q.Images).HasColumnType("text[]").IsRequired();
            entity.Property(q => q.Type).IsRequired().HasConversion<string>();
            entity.Property(q => q.SelectCount).IsRequired().HasDefaultValue(1);
            entity.Property(q => q.Domain).HasMaxLength(255);
            entity.Property(q => q.Concepts).HasColumnType("text[]");
            entity.Property(q => q.ServiceCategory).HasMaxLength(255);
            entity.Property(q => q.Services).HasColumnType("text[]");
            entity.Property(q => q.Explanation).HasColumnType("text");
            entity.Property(q => q.Difficulty).IsRequired().HasConversion<string>();
            entity.Property(q => q.CreatedAt).IsRequired();

            entity.HasOne(q => q.Quiz)
                .WithMany(q => q.Questions)
                .HasForeignKey(q => q.QuizId);

            entity.HasMany(q => q.Answers)
                .WithOne(a => a.Question)
                .HasForeignKey(a => a.QuestionId);
        });

        modelBuilder.Entity<Answer>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Text).HasColumnType("text");
            entity.Property(a => a.IsCorrect).IsRequired();
            entity.Property(a => a.Image).HasMaxLength(255);
            entity.Property(a => a.CreatedAt).IsRequired();

            entity.HasOne(a => a.Question)
                .WithMany(q => q.Answers)
                .HasForeignKey(a => a.QuestionId);
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Email).IsRequired().HasMaxLength(255);
            entity.Property(s => s.Finished).IsRequired();
            entity.Property(s => s.ServedQuestionIds).HasColumnType("integer[]").IsRequired();
            entity.Property(s => s.Score).IsRequired();
            entity.Property(s => s.CreatedAt).IsRequired();

            entity.HasOne<Quiz>()
                .WithMany()
                .HasForeignKey(s => s.QuizId);

            entity.HasOne<Subquiz>()
                .WithMany()
                .HasForeignKey(s => s.SubquizId);

            // Recorded Answers belong to the Submission: one row per (Submission, Question),
            // so a Question can be Checked at most once. See docs/adr/0002-incremental-subquiz-feedback.md.
            entity.HasMany(s => s.RecordedAnswers)
                .WithOne()
                .HasForeignKey(r => r.SubmissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RecordedAnswer>(entity =>
        {
            entity.HasKey(r => new { r.SubmissionId, r.QuestionId });
            entity.Property(r => r.SelectedAnswerIds).HasColumnType("integer[]").IsRequired();
        });
    }
}
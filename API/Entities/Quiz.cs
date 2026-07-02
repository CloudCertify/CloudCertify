using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities;

[Table("Quiz")]
public class Quiz
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }
    
    public string Title { get; set; }
    
    public string Description { get; set; }
    
    public string IconName { get; set; }

    public bool IsAvailable { get; set; } = false;

    // Per-quiz served-question count. A fixed exam sets both equal (CLF-C02 = 65/65);
    // a ranged quiz sets e.g. 40/60 and a count in [Min, Max] is picked at start (issue #13).
    public int MinQuestions { get; set; } = 40;

    public int MaxQuestions { get; set; } = 60;

    public QuizProvider QuizProvider { get; set; }
    
     public QuizLevel QuizLevel { get; set; }

      public string Slug { get; set; }

      // SHA-256 of the seeded questions file; a mismatch at startup triggers a
      // full question re-seed for this quiz (see QuizCatalogSeeder).
      public string? QuestionsHash { get; set; }

      public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
     
     public virtual ICollection<Question> Questions { get; set; }

     public virtual ICollection<Subquiz> SubQuizzes { get; set; } = new List<Subquiz>();
}

public enum QuizLevel
{
    Foundational,
    Associate,
    Professional,
    Specialist
}

public enum QuizProvider
{
    Azure,
    AWS,
    GCP
}
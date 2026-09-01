using API.Entities;

namespace API.Dto;

public class QuizDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string IconName { get; set; }
    public bool IsAvailable { get; set; }
    public QuizProvider QuizProvider { get; set; }
     public QuizLevel QuizLevel { get; set; }
      public string Slug { get; set; }
      public DateTime CreatedAt { get; init; }
      public int QuestionCount { get; set; }
      public int MinQuestions { get; set; }
      public int MaxQuestions { get; set; }
      public List<DrillDto>? Drills { get; set; }
}
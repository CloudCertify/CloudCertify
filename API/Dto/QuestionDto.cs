using API.Entities;

namespace API.Dto;

public class QuestionDto
{
    public int Id { get; set; }
    public string? Text { get; set; }
    public string[] Images { get; set; }
    public QuestionType Type { get; set; }
    public int SelectCount { get; set; }
    public QuestionDifficulty Difficulty { get; set; }
    public ICollection<AnswerDto> Answers { get; set; } = new List<AnswerDto>();
}

public class AnswerDto
{
    public int Id { get; set; }
    public string? Text { get; set; }
    public string? Image { get; set; }
}

using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace API.Entities;

[Table("Question")]
public class Question
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }

    public int QuizId { get; set; }

    public string? Text { get; set; }

    public string[] Images { get; set; } = [];

    public QuestionType Type { get; set; }

    public int SelectCount { get; set; }

    public string? Domain { get; set; }

    public string[]? Concepts { get; set; }

    public string? ServiceCategory { get; set; }

    public string[]? Services { get; set; }

    public string? Explanation { get; set; }

    /// <summary>PT-BR translation of Text; null falls back to EN-US per field (ADR 0004).</summary>
    public string? TextPt { get; set; }

    /// <summary>PT-BR translation of Explanation; null falls back to EN-US per field (ADR 0004).</summary>
    public string? ExplanationPt { get; set; }

    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public virtual ICollection<Answer> Answers { get; set; }

    [JsonIgnore]
    public virtual Quiz Quiz { get; set; }
}

public enum QuestionType
{
    MultipleChoice,
    MultipleResponse,
}

public enum QuestionDifficulty
{
    Easy,
    Medium,
    Hard,
}

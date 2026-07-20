using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace API.Entities;

[Table("Answer")]
public class Answer
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; init; }

    public int QuestionId { get; set; }

    public string? Text { get; set; }

    /// <summary>PT-BR translation of Text; null falls back to EN-US per field (ADR 0004).</summary>
    public string? TextPt { get; set; }

    [JsonIgnore]
    public bool IsCorrect { get; set; }

    public string? Image { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    [JsonIgnore]
    public virtual Question Question { get; set; }
}

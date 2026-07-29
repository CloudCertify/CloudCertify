using API.Entities;
using API.Services.Grading;

namespace API.Model.Response;

public class SubmitQuizResponseDto
{
    public required int Score { get; set; }
    public required int TotalQuestions { get; set; }
    public required int CorrectCount { get; set; }
    public required int ScaledScore { get; set; }
    public required bool Passed { get; set; }

    /// <summary>
    /// Questions rated <see cref="Confidence.Guess"/> and answered correctly — what a raw score
    /// hides as a win. Counted from the persisted Recorded Answers; unrated answers are absent
    /// from both counts (ADR 0006).
    /// </summary>
    public required int LuckyGuessCount { get; set; }

    /// <summary>
    /// Questions rated <see cref="Confidence.Confident"/> and answered incorrectly — "I was sure,
    /// and I was wrong", the signal worth acting on. Counted from the persisted Recorded Answers.
    /// </summary>
    public required int MisconceptionCount { get; set; }

    public required List<DomainResult> DomainBreakdown { get; set; }
    public required List<QuizResultQuestionDto> Questions { get; set; }
}

public class QuizResultQuestionDto
{
    public required int Id { get; set; }
    public required string Text { get; set; }
    public required QuestionType Type { get; set; }
    public string? Domain { get; set; }
    public string[]? Concepts { get; set; }
    public string? ServiceCategory { get; set; }
    public string[]? Services { get; set; }
    public string? Explanation { get; set; }

    /// <summary>How sure the visitor was, shown in review beside the explanation. Null when unrated.</summary>
    public Confidence? Confidence { get; set; }

    public required List<QuizResultAnswerDto> Answers { get; set; }
}

public class QuizResultAnswerDto
{
    public required int Id { get; set; }
    public string? Text { get; set; }
    public string? Image { get; set; }
    public required bool IsCorrect { get; set; }
    public required bool WasSelected { get; set; }
}

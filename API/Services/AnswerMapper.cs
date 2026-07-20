using API.Dto;
using API.Entities;
using API.Model.Response;

namespace API.Services;

/// <summary>
/// Maps <see cref="Answer"/> entities to the DTO shapes shared by the full-quiz and
/// subquiz paths. Centralised so the two submit flows cannot drift apart (issue #12).
/// </summary>
public static class AnswerMapper
{
    /// <summary>Maps an Answer to the start-flow shape without revealing correctness.</summary>
    /// <example><code>AnswerMapper.ToDto(answer, Language.PtBr)</code></example>
    public static AnswerDto ToDto(Answer answer, Language language)
    {
        return new AnswerDto
        {
            Id = answer.Id,
            Text = LocalizedContent.Text(answer, language),
            Image = answer.Image,
        };
    }

    /// <summary>Maps an Answer to the result-flow shape with correctness and selection.</summary>
    /// <example><code>AnswerMapper.ToResultDto(answer, true, Language.PtBr)</code></example>
    public static QuizResultAnswerDto ToResultDto(Answer answer, bool wasSelected, Language language)
    {
        return new QuizResultAnswerDto
        {
            Id = answer.Id,
            Text = LocalizedContent.Text(answer, language),
            Image = answer.Image,
            IsCorrect = answer.IsCorrect,
            WasSelected = wasSelected,
        };
    }
}

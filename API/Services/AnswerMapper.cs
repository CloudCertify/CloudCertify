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
    /// <summary>Start-flow shape: hides correctness, used when serving questions.</summary>
    public static AnswerDto ToDto(Answer answer, Language language)
    {
        return new AnswerDto
        {
            Id = answer.Id,
            Text = LocalizedContent.Text(answer, language),
            Image = answer.Image,
        };
    }

    /// <summary>Result-flow shape: reveals correctness and whether the user picked it.</summary>
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

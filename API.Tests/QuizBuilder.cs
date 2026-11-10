using API.Entities;

namespace API.Tests;

/// <summary>
/// Builds <see cref="Question"/>/<see cref="Answer"/> graphs and Recorded Answers
/// for grading tests, so each test states only the facts it cares about. Keeps the
/// fragile entity-wiring (back-references, ids) in one place.
/// </summary>
internal static class QuizBuilder
{
    /// <summary>A question whose correct answers are <paramref name="correctIds"/> and distractors <paramref name="wrongIds"/>.</summary>
    public static Question Question(int id, string? domain, int[] correctIds, int[] wrongIds,
        string? explanation = null, QuestionType type = QuestionType.MultipleChoice)
    {
        var answers = correctIds.Select(aid => new Answer { Id = aid, IsCorrect = true })
            .Concat(wrongIds.Select(aid => new Answer { Id = aid, IsCorrect = false }))
            .ToList();
        return new Question { Id = id, Domain = domain, Answers = answers, Explanation = explanation, Type = type };
    }

    /// <summary>A Recorded Answer already committed (Checked) for <paramref name="questionId"/>.</summary>
    public static RecordedAnswer Recorded(int questionId, params int[] answerIds)
    {
        return new RecordedAnswer { QuestionId = questionId, SelectedAnswerIds = answerIds.ToList() };
    }

    /// <summary>A Recorded Answer whose commit-time verdict was <paramref name="isCorrect"/> (ADR 0007).</summary>
    public static RecordedAnswer Stamped(int questionId, bool isCorrect, params int[] answerIds)
    {
        return new RecordedAnswer { QuestionId = questionId, SelectedAnswerIds = answerIds.ToList(), IsCorrect = isCorrect };
    }
}

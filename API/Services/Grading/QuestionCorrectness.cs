using API.Entities;

namespace API.Services.Grading;

/// <summary>
/// Single source of the per-Question exact-match rule, run only when an answer is committed (at
/// Check in Practice, at answer-commit in an Exam) and stamped on the Recorded Answer. Grading
/// reads that stamp and never calls this (ADR 0007). A Question is correct only when the selected
/// answer ids are exactly its correct answer ids — every correct one picked, no incorrect one
/// picked. For a multiple_response Question a partial selection is wrong (the AWS-matching rule).
/// </summary>
public static class QuestionCorrectness
{
    public static bool IsCorrect(Question question, IReadOnlyCollection<int> selectedAnswerIds)
    {
        var correctAnswerIds = question.Answers
            .Where(a => a.IsCorrect)
            .Select(a => a.Id)
            .ToList();

        return selectedAnswerIds.Count == correctAnswerIds.Count &&
               !selectedAnswerIds.Except(correctAnswerIds).Any();
    }
}

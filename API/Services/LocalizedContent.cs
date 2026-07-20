using API.Entities;

namespace API.Services;

/// <summary>
/// Picks a Question/Answer field in the resolved <see cref="Language"/>, falling back to
/// EN-US per field when a translation is missing so a question is never blank (ADR 0004).
/// DTOs keep their single text/explanation fields; this is the only place the PT columns
/// are read.
/// </summary>
/// <example>LocalizedContent.Text(question, Language.PtBr) // question.TextPt ?? question.Text</example>
public static class LocalizedContent
{
    /// <summary>Returns localized Question text with per-field EN-US fallback.</summary>
    /// <example><code>LocalizedContent.Text(question, Language.PtBr)</code></example>
    public static string? Text(Question question, Language language) =>
        Pick(question.Text, question.TextPt, language);

    /// <summary>Returns localized Question explanation with per-field EN-US fallback.</summary>
    /// <example><code>LocalizedContent.Explanation(question, Language.PtBr)</code></example>
    public static string? Explanation(Question question, Language language) =>
        Pick(question.Explanation, question.ExplanationPt, language);

    /// <summary>Returns localized Answer text with per-field EN-US fallback.</summary>
    /// <example><code>LocalizedContent.Text(answer, Language.PtBr)</code></example>
    public static string? Text(Answer answer, Language language) =>
        Pick(answer.Text, answer.TextPt, language);

    private static string? Pick(string? en, string? pt, Language language) =>
        language == Language.PtBr && pt != null ? pt : en;
}

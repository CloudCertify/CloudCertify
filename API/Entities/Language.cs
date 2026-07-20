namespace API.Entities;

/// <summary>
/// The locale a Submission is served in. Chosen from Accept-Language at attempt start,
/// fixed on the Submission for its whole life (no mid-attempt switch). Persisted as the
/// IETF tag ("en-US" / "pt-BR") — see ADR 0004 and the Language glossary entry.
/// </summary>
public enum Language
{
    EnUs,
    PtBr,
}

/// <summary>Maps <see cref="Language"/> to/from its persisted IETF tag.</summary>
public static class LanguageCode
{
    /// <summary>Returns the persisted IETF tag for a Submission language.</summary>
    /// <example><code>LanguageCode.ToTag(Language.PtBr) // "pt-BR"</code></example>
    public static string ToTag(Language language) => language switch
    {
        Language.PtBr => "pt-BR",
        _ => "en-US",
    };

    /// <summary>Reads a persisted IETF tag, defaulting unknown values to EN-US.</summary>
    /// <example><code>LanguageCode.FromTag("pt-BR") // Language.PtBr</code></example>
    public static Language FromTag(string? tag) =>
        string.Equals(tag, "pt-BR", StringComparison.OrdinalIgnoreCase) ? Language.PtBr : Language.EnUs;
}

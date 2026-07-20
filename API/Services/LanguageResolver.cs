using API.Entities;

namespace API.Services;

/// <summary>
/// The single place an Accept-Language header becomes a <see cref="Language"/> (issue #37).
/// Honors quality ordering; anything unrecognized (or missing) resolves to EnUs so an
/// unsupported preference always yields a working quiz.
/// </summary>
/// <example>LanguageResolver.Resolve("pt-BR,pt;q=0.9,en;q=0.8") // Language.PtBr</example>
public static class LanguageResolver
{
    public static Language Resolve(string? acceptLanguage)
    {
        if (string.IsNullOrWhiteSpace(acceptLanguage))
        {
            return Language.EnUs;
        }

        var preferred = acceptLanguage.Split(',')
            .Select(ParseEntry)
            .Where(e => e.Quality > 0)
            .OrderByDescending(e => e.Quality)
            .Select(e => Recognize(e.Tag))
            .FirstOrDefault(l => l != null);

        return preferred ?? Language.EnUs;
    }

    private static (string Tag, double Quality) ParseEntry(string entry)
    {
        var parts = entry.Split(';', StringSplitOptions.TrimEntries);
        var quality = 1.0;
        foreach (var part in parts.Skip(1))
        {
            if (part.StartsWith("q=", StringComparison.OrdinalIgnoreCase)
                && double.TryParse(part[2..], System.Globalization.CultureInfo.InvariantCulture, out var q))
            {
                quality = q;
            }
        }
        return (parts[0], quality);
    }

    /// <summary>A supported language or null — null keeps quality ordering scanning past e.g. fr-FR.</summary>
    private static Language? Recognize(string tag)
    {
        if (tag.StartsWith("pt", StringComparison.OrdinalIgnoreCase)) return Language.PtBr;
        if (tag.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return Language.EnUs;
        return null;
    }
}

using API.Entities;

namespace API.Tests.Entities;

public class LanguageCodeTests
{
    [Theory]
    [InlineData(Language.EnUs, "en-US")]
    [InlineData(Language.PtBr, "pt-BR")]
    public void ToTag_ReturnsPersistedIetfTag(Language language, string expected)
    {
        Assert.Equal(expected, LanguageCode.ToTag(language));
    }

    [Theory]
    [InlineData("en-US", Language.EnUs)]
    [InlineData("pt-BR", Language.PtBr)]
    [InlineData("PT-br", Language.PtBr)]
    [InlineData("unknown", Language.EnUs)]
    [InlineData(null, Language.EnUs)]
    public void FromTag_ReturnsPersistedLanguageOrEnUsFallback(string? tag, Language expected)
    {
        Assert.Equal(expected, LanguageCode.FromTag(tag));
    }
}

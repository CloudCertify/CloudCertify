using API.Entities;
using API.Services;

namespace API.Tests.Services;

public class LanguageResolverTests
{
    [Theory]
    [InlineData("pt-BR", Language.PtBr)]
    [InlineData("pt", Language.PtBr)]
    [InlineData("PT-br", Language.PtBr)]
    [InlineData("en-US", Language.EnUs)]
    [InlineData("en", Language.EnUs)]
    public void Resolve_ExactMatch(string header, Language expected)
    {
        Assert.Equal(expected, LanguageResolver.Resolve(header));
    }

    [Theory]
    [InlineData("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7", Language.PtBr)]
    [InlineData("en-US,en;q=0.9,pt-BR;q=0.8", Language.EnUs)]
    [InlineData("en;q=0.5, pt-BR;q=0.9", Language.PtBr)] // quality order beats listing order
    [InlineData("fr-FR,pt-BR;q=0.5", Language.PtBr)]     // unsupported first choice skipped
    public void Resolve_HonorsQualityLists(string header, Language expected)
    {
        Assert.Equal(expected, LanguageResolver.Resolve(header));
    }

    [Theory]
    [InlineData("fr-FR")]
    [InlineData("de,fr;q=0.9")]
    [InlineData("garbage;;;")]
    [InlineData("ptato")]
    [InlineData("pt-BRZZ")]
    public void Resolve_UnknownLanguage_FallsBackToEnUs(string header)
    {
        Assert.Equal(Language.EnUs, LanguageResolver.Resolve(header));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Resolve_MissingHeader_DefaultsToEnUs(string? header)
    {
        Assert.Equal(Language.EnUs, LanguageResolver.Resolve(header));
    }
}

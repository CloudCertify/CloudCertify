using System.Web;

namespace API.External.OAuth;

/// <summary>URL-encodes and appends a query dictionary to a base URL.</summary>
/// <example>QueryStringComposer.Compose("https://x/auth", new() { ["a"] = "b" }) // "https://x/auth?a=b"</example>
public static class QueryStringComposer
{
    public static string Compose(string baseUrl, Dictionary<string, string?> query)
    {
        var pairs = query
            .Where(kv => kv.Value != null)
            .Select(kv => $"{HttpUtility.UrlEncode(kv.Key)}={HttpUtility.UrlEncode(kv.Value)}");
        return $"{baseUrl}?{string.Join("&", pairs)}";
    }
}

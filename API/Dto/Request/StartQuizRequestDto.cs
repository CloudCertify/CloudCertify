namespace API.Model.Request;

public class StartQuizRequestDto
{
    /// <summary>
    /// Self-reported email for an anonymous attempt. Ignored when a bearer token is present
    /// (the token's User owns the attempt instead); required otherwise. ADR 0003.
    /// </summary>
    public string? Email { get; set; }
}

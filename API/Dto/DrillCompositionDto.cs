namespace API.Dto;

/// <summary>
/// How a drill was made up, counted over the Questions actually served and read going in: how
/// many the User had Missed, had Mastered but now owe a review (Due), had never seen, and had
/// Mastered and not yet Due — the last-resort seats (ADR 0008, ADR 0013).
/// </summary>
/// <remarks>
/// Only a logged-in User's drill has one — an anonymous visitor's draw is uniformly random, so
/// there is no composition to tell them about, and the absent field is what the web app turns
/// into the sign-in pitch instead.
/// </remarks>
public class DrillCompositionDto
{
    public int Missed { get; init; }
    public int Due { get; init; }
    public int Unseen { get; init; }
    public int Mastered { get; init; }
}

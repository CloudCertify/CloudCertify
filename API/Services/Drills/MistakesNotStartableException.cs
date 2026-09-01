namespace API.Services.Drills;

/// <summary>Why a Mistakes attempt was refused before it started (ADR 0011).</summary>
public enum MistakesGate
{
    /// <summary>Anonymous: both halves of the union are a User's own evidence.</summary>
    SignInRequired,

    /// <summary>No misses and no low ratings. The drill is visible, but not startable.</summary>
    NothingToReview,
}

/// <summary>
/// The Mistakes Drill refusing to start. Both cases are ordinary states of the visitor's
/// history, not faults, so the caller turns them into a status rather than an error page.
/// </summary>
public sealed class MistakesNotStartableException : InvalidOperationException
{
    public MistakesNotStartableException(MistakesGate gate) : base(Describe(gate))
    {
        Gate = gate;
    }

    public MistakesGate Gate { get; }

    private static string Describe(MistakesGate gate) => gate switch
    {
        MistakesGate.SignInRequired => "Mistakes is a logged-in drill: sign in to review your own mistakes",
        MistakesGate.NothingToReview => "Nothing to review: no missed Questions and no low-confidence ratings",
        _ => "Mistakes cannot be started",
    };
}

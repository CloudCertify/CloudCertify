namespace API.Tests;

/// <summary>A <see cref="TimeProvider"/> stuck at one instant, so Recall can be read at a chosen "now".</summary>
internal sealed class FixedClock(DateTime utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => new(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
}

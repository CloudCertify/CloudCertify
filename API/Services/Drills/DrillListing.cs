using API.Entities;

namespace API.Services.Drills;

/// <summary>
/// The order a Quiz's Drills are listed in: the whole-Quiz Mix first, as the main way to
/// practice, then the rest by Id (ADR 0013). Ordering is explicit because the Mix drill is seeded
/// after the Domain drills on an existing catalog, so its Id is no guide.
/// </summary>
public static class DrillListing
{
    public static IEnumerable<Drill> Ordered(IEnumerable<Drill> drills) =>
        drills.OrderBy(d => IsWholeQuizMix(d) ? 0 : 1).ThenBy(d => d.Id);

    private static bool IsWholeQuizMix(Drill drill) =>
        drill.DrawRule == DrawRule.DrillMix && drill.Domain == null;
}

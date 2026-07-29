namespace API.Entities;

/// <summary>
/// The visitor's self-reported certainty about a Question's answer, committed with the answer
/// itself and revisable with it. Names the two things a score cannot: a lucky guess
/// (<see cref="Guess"/> + correct) and a misconception (<see cref="Confident"/> + incorrect).
/// Never affects grading — self-reported data is not score-bearing.
///
/// There is deliberately no Unrated member: an unrated answer stores no Confidence at all
/// (a nullable property), so an "unrated" bucket cannot show up in a GROUP BY (ADR 0006).
/// Collected in a full Quiz only — a Subquiz Check reveals correctness immediately.
/// </summary>
public enum Confidence
{
    Guess,
    Unsure,
    Confident,
}

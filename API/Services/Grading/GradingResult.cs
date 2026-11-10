namespace API.Services.Grading;

public record DomainResult(string Domain, int Correct, int Total, double Weight);

/// <param name="PassingScore">The mark <see cref="ScaledScore"/> was compared against: the Scaled
/// Score pass mark for an Exam, 70 for Practice.</param>
public record GradingResult(
    int ScaledScore,
    bool Passed,
    int CorrectCount,
    int TotalQuestions,
    List<DomainResult> DomainBreakdown,
    int PassingScore
);

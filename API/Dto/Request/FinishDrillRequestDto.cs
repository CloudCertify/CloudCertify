namespace API.Model.Request;

/// <summary>Finishes a Drill attempt: grades the accumulated Recorded Answers for this Submission.</summary>
public class FinishDrillRequestDto
{
    public int SubmissionId { get; set; }
}

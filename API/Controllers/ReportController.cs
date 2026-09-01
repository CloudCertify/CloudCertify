using API.Model.Request;
using API.Model.Response;
using API.Services;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Report endpoints: flag a Question's content as defective.
/// </summary>
[ApiController]
[Route("reports")]
public class ReportController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportController(ReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>
    /// File a Report against a defective Question. Only for a Question already Checked on a
    /// Practice Submission — that Recorded Answer is the evidence and the anti-abuse gate, so
    /// anonymous visitors may report. The Report's language comes from the Submission
    /// (ADR 0004) and filing never re-grades the attempt (ADR 0001, ADR 0005).
    /// The Report may carry a suggested edit — a sparse patch of proposed question/answer text
    /// and key, stored for a human to read and never applied automatically (ADR 0009).
    /// Returns 400 for an empty reason set, an over-long comment, an inapplicable suggestion, an
    /// unchecked question or a full-quiz submission; 404 for an unknown submission; 409 when the
    /// same question already carries a triaged report on that submission. Re-filing while the
    /// existing report is still open replaces it, so a claim can be upgraded to a suggestion.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReportResponseDto>> CreateReport([FromBody] CreateReportRequestDto request)
    {
        var result = await _reportService.FileReport(request);

        return result.Outcome switch
        {
            ReportOutcome.Filed => StatusCode(StatusCodes.Status201Created, result.Report),
            ReportOutcome.SubmissionNotFound => NotFound(result.Message),
            ReportOutcome.AlreadyReported => Conflict(result.Message),
            _ => BadRequest(result.Message),
        };
    }
}

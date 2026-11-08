using API.Dto;
using API.Entities;
using API.Repositories;
using API.Services.Drills;

namespace API.Services;

/// <summary>
/// Per-you Progress on a Quiz. Folds finished Submissions the same way
/// <see cref="OutcomeSnapshot"/> does, then reads Standing per Domain as mean Recall at the
/// injected clock's "now" (ADR 0013).
/// </summary>
/// <example>
/// var progress = await progressService.Get(userId, quizId);
/// </example>
public class ProgressService(
    ISubmissionRepository submissionRepository,
    IQuestionRepository questionRepository,
    IQuizRepository quizRepository,
    TimeProvider timeProvider)
{
    public const int EligibilityFloor = 5;
    public const int TrendLimit = 10;

    /// <summary>Quizzes this User has finished at least once — the Progress selector.</summary>
    /// <example>var quizzes = await progressService.ListQuizzes(userId);</example>
    public async Task<List<QuizDto>> ListQuizzes(int userId)
    {
        var finishedIds = (await submissionRepository.GetByUserId(userId))
            .Where(s => s.Finished)
            .Select(s => s.QuizId)
            .ToHashSet();

        var quizzes = await quizRepository.GetQuizzes();
        return quizzes.Where(q => finishedIds.Contains(q.Id)).Select(QuizService.ToDto).ToList();
    }

    /// <summary>Progress on one Quiz, or null when the Quiz is missing.</summary>
    /// <example>var progress = await progressService.Get(userId, quizId);</example>
    public async Task<ProgressDto?> Get(int userId, int quizId)
    {
        if (await quizRepository.GetQuizById(quizId) == null) return null;

        var finished = await submissionRepository.GetFinishedByUserAndQuiz(userId, quizId);
        var questions = await questionRepository.GetQuestionsByQuizId(quizId);
        return Build(finished, questions, timeProvider.GetUtcNow().UtcDateTime);
    }

    /// <summary>
    /// Pure fold used by the endpoint and by tests. Unfinished Submissions are dropped,
    /// matching <see cref="OutcomeSnapshot.Build"/>. Recall is read at <paramref name="now"/>.
    /// </summary>
    /// <example>var dto = ProgressService.Build(submissions, questions, DateTime.UtcNow);</example>
    public static ProgressDto Build(IEnumerable<Submission> submissions, IReadOnlyList<Question> questions, DateTime now)
    {
        var finished = submissions.Where(s => s.Finished).ToList();
        var exams = FinishedExams(finished);
        var domains = DomainRows(finished, exams, questions, now);
        return new ProgressDto
        {
            Domains = domains,
            Trend = exams.TakeLast(TrendLimit).Select(ExamTrendPoint).ToList(),
            FinishedExams = exams.Count,
            FinishedDrills = finished.Count(s => s.Mode == Mode.Practice),
            Lead = LeadOf(domains),
        };
    }

    private static List<Submission> FinishedExams(List<Submission> finished) =>
        finished.Where(s => s.Mode == Mode.Exam).OrderBy(s => s.CreatedAt).ThenBy(s => s.Id).ToList();

    private static List<DomainStandingDto> DomainRows(
        List<Submission> finished, List<Submission> exams, IReadOnlyList<Question> questions, DateTime now)
    {
        var current = Standings(finished, questions, now);
        // Read the previous Standing at the previous Exam's own instant, so the delta compares
        // Recall then against Recall now rather than two readings of today's decay.
        var previous = exams.Count >= 2
            ? Standings(AsOf(finished, exams[^2]), questions, exams[^2].CreatedAt)
            : null;
        return current.Keys
            .OrderBy(name => name, StringComparer.Ordinal)
            .Select(name => DomainRow(name, current[name], previous))
            .ToList();
    }

    private static DomainStandingDto DomainRow(
        string name, (double Recall, int Seen) current, Dictionary<string, (double Recall, int Seen)>? previous)
    {
        var standing = Percent(current.Recall, current.Seen);
        var prior = previous?.GetValueOrDefault(name) ?? (0, 0);
        int? delta = previous == null ? null : standing - Percent(prior.Recall, prior.Seen);
        return new DomainStandingDto { Name = name, Standing = standing, Seen = current.Seen, Delta = delta };
    }

    private static string? LeadOf(IReadOnlyList<DomainStandingDto> domains) =>
        domains
            .Where(d => d.Seen >= EligibilityFloor)
            .OrderBy(d => d.Standing)
            .ThenByDescending(d => d.Seen)
            .ThenBy(d => d.Name, StringComparer.Ordinal)
            .FirstOrDefault()?.Name;

    /// <summary>Summed Recall and seen count per Domain. Unseen Questions have no Recall and stay out.</summary>
    private static Dictionary<string, (double Recall, int Seen)> Standings(
        IEnumerable<Submission> submissions, IReadOnlyList<Question> questions, DateTime at)
    {
        var domainOf = questions
            .Where(q => !string.IsNullOrEmpty(q.Domain))
            .ToDictionary(q => q.Id, q => q.Domain!);
        var snapshot = OutcomeSnapshot.Build(submissions, domainOf.Keys.ToHashSet(), at);
        var counts = new Dictionary<string, (double Recall, int Seen)>(StringComparer.Ordinal);

        foreach (var (questionId, evidence) in snapshot.Outcomes)
        {
            if (!domainOf.TryGetValue(questionId, out var domain)) continue;
            var (recall, seen) = counts.GetValueOrDefault(domain);
            counts[domain] = (recall + evidence.RecallAt(at), seen + 1);
        }

        return counts;
    }

    private static List<Submission> AsOf(List<Submission> finished, Submission exam) =>
        finished.Where(s => s.CreatedAt < exam.CreatedAt
                            || (s.CreatedAt == exam.CreatedAt && s.Id <= exam.Id))
            .ToList();

    private static TrendPointDto ExamTrendPoint(Submission exam)
    {
        var correctness = exam.RecordedAnswers.ToDictionary(r => r.QuestionId, r => r.IsCorrect == true);
        var correct = exam.ServedQuestionIds.Count(id => correctness.GetValueOrDefault(id));
        return new TrendPointDto
        {
            SubmissionId = exam.Id,
            CreatedAt = exam.CreatedAt,
            Percent = Percent(correct, exam.ServedQuestionIds.Count),
        };
    }

    private static int Percent(double numerator, int denominator) =>
        denominator == 0 ? 0 : (int)Math.Round((double)numerator * 100 / denominator);
}

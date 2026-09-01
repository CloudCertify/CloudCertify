using API.Dto;
using API.Entities;
using API.Repositories;
using API.Services.Drills;

namespace API.Services;

/// <summary>
/// Per-you Progress on a Quiz. Folds finished Submissions the same way
/// <see cref="OutcomeSnapshot"/> does, then reads Standing per Domain.
/// </summary>
/// <example>
/// var progress = await progressService.Get(userId, quizId);
/// </example>
public class ProgressService(
    ISubmissionRepository submissionRepository,
    IQuestionRepository questionRepository,
    IQuizRepository quizRepository)
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
        return Build(finished, questions);
    }

    /// <summary>
    /// Pure fold used by the endpoint and by tests. Unfinished Submissions are dropped,
    /// matching <see cref="OutcomeSnapshot.Build"/>.
    /// </summary>
    /// <example>var dto = ProgressService.Build(submissions, questions);</example>
    public static ProgressDto Build(IEnumerable<Submission> submissions, IReadOnlyList<Question> questions)
    {
        var finished = submissions.Where(s => s.Finished).ToList();
        var exams = FinishedExams(finished);
        var domains = DomainRows(finished, exams, questions);
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
        List<Submission> finished, List<Submission> exams, IReadOnlyList<Question> questions)
    {
        var current = Standings(finished, questions);
        var previous = exams.Count >= 2 ? Standings(AsOf(finished, exams[^2]), questions) : null;
        return current.Keys
            .OrderBy(name => name, StringComparer.Ordinal)
            .Select(name => DomainRow(name, current[name], previous))
            .ToList();
    }

    private static DomainStandingDto DomainRow(
        string name, (int Mastered, int Seen) current, Dictionary<string, (int Mastered, int Seen)>? previous)
    {
        var standing = Percent(current.Mastered, current.Seen);
        var prior = previous?.GetValueOrDefault(name) ?? (0, 0);
        int? delta = previous == null ? null : standing - Percent(prior.Mastered, prior.Seen);
        return new DomainStandingDto { Name = name, Standing = standing, Seen = current.Seen, Delta = delta };
    }

    private static string? LeadOf(IReadOnlyList<DomainStandingDto> domains) =>
        domains
            .Where(d => d.Seen >= EligibilityFloor)
            .OrderBy(d => d.Standing)
            .ThenByDescending(d => d.Seen)
            .ThenBy(d => d.Name, StringComparer.Ordinal)
            .FirstOrDefault()?.Name;

    private static Dictionary<string, (int Mastered, int Seen)> Standings(
        IEnumerable<Submission> submissions, IReadOnlyList<Question> questions)
    {
        var domainOf = questions
            .Where(q => !string.IsNullOrEmpty(q.Domain))
            .ToDictionary(q => q.Id, q => q.Domain!);
        var snapshot = OutcomeSnapshot.Build(submissions, domainOf.Keys.ToHashSet());
        var counts = new Dictionary<string, (int Mastered, int Seen)>(StringComparer.Ordinal);

        foreach (var (questionId, evidence) in snapshot.Outcomes)
        {
            if (!domainOf.TryGetValue(questionId, out var domain)) continue;
            var (mastered, seen) = counts.GetValueOrDefault(domain);
            counts[domain] = (mastered + (evidence.Outcome == Outcome.Mastered ? 1 : 0), seen + 1);
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

    private static int Percent(int numerator, int denominator) =>
        denominator == 0 ? 0 : (int)Math.Round((double)numerator * 100 / denominator);
}

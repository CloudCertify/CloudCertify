using API.Entities;

namespace API.Services.Grading;

public static class GradingStrategyFactory
{
    public static IGradingStrategy GetStrategy(Quiz quiz)
    {
        return quiz.Slug switch
        {
            "CLF-C02" => new ClfC02GradingStrategy(),
            "SAA-C03" => new SaaC03GradingStrategy(),
            "DVA-C02" => new DvaC02GradingStrategy(),
            "SOA-C03" => new SoaC03GradingStrategy(),
            "ANS-C01" => new AnsC01GradingStrategy(),
            "SCS-C03" => new ScsC03GradingStrategy(),
            _ => new DefaultGradingStrategy()
        };
    }

    // A Subquiz is a single-Domain drill scored as a plain 0-100 percentage,
    // not the scaled-score scale used by full quizzes. See issue #10.
    public static IGradingStrategy GetSubquizStrategy()
    {
        return new DomainSubquizGradingStrategy();
    }
}

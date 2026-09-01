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
            "SAP-C02" => new SapC02GradingStrategy(),
            "DOP-C02" => new DopC02GradingStrategy(),
            "AIF-C01" => new AifC01GradingStrategy(),
            "DEA-C01" => new DeaC01GradingStrategy(),
            "MLA-C01" => new MlaC01GradingStrategy(),
            _ => new DefaultGradingStrategy()
        };
    }

    // A Practice attempt is scored as a plain 0-100 percentage, not the scaled-score scale
    // an Exam uses. Grading follows Mode, not which Drill was picked (ADR 0010, issue #10).
    public static IGradingStrategy GetPracticeStrategy()
    {
        return new PracticeGradingStrategy();
    }
}

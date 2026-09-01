using System.Security.Claims;
using API.Controllers;
using API.Repositories;
using API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace API.Tests.Controllers;

public class MeControllerTests
{
    private static MeController Controller(ProgressService progress)
    {
        var controller = new MeController(
            new Mock<IUserRepository>().Object,
            new Mock<ISubmissionRepository>().Object,
            progress);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity()),
            },
        };
        return controller;
    }

    private static ProgressService Progress(
        Mock<ISubmissionRepository> submissions,
        Mock<IQuestionRepository> questions,
        Mock<IQuizRepository> quizzes) =>
        new(submissions.Object, questions.Object, quizzes.Object);

    [Fact]
    public async Task GetMyProgressQuizzes_Returns401_WhenSignedOut()
    {
        var result = await Controller(Progress(new(), new(), new())).GetMyProgressQuizzes();

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetMyProgress_Returns401_WhenSignedOut()
    {
        var result = await Controller(Progress(new(), new(), new())).GetMyProgress(1);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetMyProgress_Returns404_WhenQuizMissing()
    {
        var quizzes = new Mock<IQuizRepository>();
        quizzes.Setup(r => r.GetQuizById(99)).ReturnsAsync((API.Entities.Quiz?)null);
        var controller = Controller(Progress(new(), new(), quizzes));
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "7")], "test"));

        var result = await controller.GetMyProgress(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }
}

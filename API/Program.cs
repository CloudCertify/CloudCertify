using System.Text.Json;
using System.Text.Json.Serialization;
using API;
using API.External;
using API.External.OAuth;
using API.Repositories;
using API.Services;
using API.Services.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, ct) =>
    {
        document.Info.Title = "CloudCertify API";
        document.Info.Description = "CloudCertify API — a cloud certification quiz and exam prep platform.";
        document.Info.Version = "v1";
        document.Servers.Add(new OpenApiServer
        {
            Url = "https://api-cloudcertify.snowye.dev",
            Description = "Production"
        });
        return Task.CompletedTask;
    });

    // Confidence? would otherwise be published as "NullableOfConfidence", giving the generated
    // client a second name for a type that has one name on the wire.
    options.CreateSchemaReferenceId = info =>
    {
        var underlying = Nullable.GetUnderlyingType(info.Type);
        return underlying is { IsEnum: true }
            ? underlying.Name
            : Microsoft.AspNetCore.OpenApi.OpenApiOptions.CreateDefaultSchemaReferenceId(info);
    };

    options.AddSchemaTransformer((schema, context, ct) =>
    {
        // Unwrap Confidence? and friends: a nullable enum is not itself an enum, so without
        // this it escapes the transformer and ships as a bare integer, which then generates a
        // number-typed client field for what is a string on the wire. The nullability stays on
        // the property, not on the shared schema — folding it in here would make every use of
        // the enum nullable.
        var underlying = Nullable.GetUnderlyingType(context.JsonTypeInfo.Type);
        var type = underlying ?? context.JsonTypeInfo.Type;
        if (type.IsEnum)
        {
            schema.Type = "string";
            schema.Format = null;
            schema.Enum = Enum.GetNames(type)
                .Select(n => (IOpenApiAny)new OpenApiString(
                    JsonNamingPolicy.SnakeCaseLower.ConvertName(n)))
                .ToList();
        }

        // A $ref cannot carry "nullable" in OpenAPI 3.0, so a property holding a nullable enum
        // has to say so by wrapping the reference. Without this, "clear my rating" (an
        // explicit null) is unrepresentable in the published contract.
        foreach (var property in context.JsonTypeInfo.Properties)
        {
            if (Nullable.GetUnderlyingType(property.PropertyType) is not { IsEnum: true })
            {
                continue;
            }

            if (schema.Properties.TryGetValue(property.Name, out var propertySchema) &&
                propertySchema.Reference != null)
            {
                schema.Properties[property.Name] = new OpenApiSchema
                {
                    AllOf = [propertySchema],
                    Nullable = true,
                };
            }
        }

        return Task.CompletedTask;
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(
    options => options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
            // .WithOrigins("https://cloudcertify.snowye.dev")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
    });

// Social login (ADR 0003): API-owned OAuth, self-issued 30-day HS256 JWT.
builder.Services.Configure<AuthSettings>(builder.Configuration.GetSection("Auth"));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSecret = builder.Configuration["Auth:JwtSecret"] ?? "";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = UserTokenIssuer.Issuer,
            ValidateAudience = false,
            IssuerSigningKey = UserTokenIssuer.SymmetricKeyFor(jwtSecret),
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IOAuthProviderClient, GoogleOAuthClient>();
builder.Services.AddHttpClient<IOAuthProviderClient, GitHubOAuthClient>();
builder.Services.AddSingleton<OAuthStateStore>();
builder.Services.AddSingleton<UserTokenIssuer>();
builder.Services.AddScoped<SocialLoginService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<IQuizRepository, QuizRepository>();
builder.Services.AddScoped<ISubquizRepository, SubquizRepository>();
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();

builder.Services.AddScoped<QuizCatalogSeeder>();
builder.Services.AddScoped<SubmissionGrader>();
builder.Services.AddScoped<QuizService>();
builder.Services.AddScoped<SubquizService>();
builder.Services.AddScoped<ReportService>();

var app = builder.Build();

// Apply pending migrations, then seed the quiz catalog so a fresh database
// self-populates on first boot. Both steps are idempotent on later boots.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();

    var seeder = scope.ServiceProvider.GetRequiredService<QuizCatalogSeeder>();
    await seeder.SeedCatalog();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference("/docs", options =>
    {
        options.WithTitle("CloudCertify API");
    });
}
    
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
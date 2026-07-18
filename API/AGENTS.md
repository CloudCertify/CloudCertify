# CloudCertify API

## Agent Guidelines

- Always use caveman skill. All responses must apply `/caveman full` mode for token efficiency. Drop filler, fragments OK, short synonyms only. See caveman skill for intensity levels (lite/full/ultra).
- For terminal work, always use `rtk` prefix on commands. RTK filters output automatically. Never run commands without `rtk` wrapper.

## Commands

- Don't run dev server commands (e.g. `bun run dev`) — assume it's already running.
- Don't run build commands unless specifically told to.
- Focus on checking commands like `bun run typecheck`, `bun run lint`, etc.

## Package Managers

- Use pnpm if the project already uses it, otherwise use bun.
- Never use npm or yarn.

# Typescript

- Never use `any` unless 100% necessary or specifically instructed.

## Code style

- Always strive for concise, simple solutions.
- If a problem can be solved in a simpler way, propose it.
- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

- Build: `dotnet build API/API.csproj` to compile & check errors.
- Run: `dotnet run --project API` from root. Starts on http://0.0.0.0:8080. API docs at http://localhost:8080/docs
- EF Core migrations:
  - Create: `dotnet ef migrations add <MigrationName> --project API`
  - Apply: `dotnet ef database update --project API`
  - Revert: `dotnet ef database update <PreviousMigration> --project API`
- Database: Uses PostgreSQL. Configure `ConnectionStrings.DefaultConnection` in appsettings.json or .env
- Docker: Run `docker compose up` to start PostgreSQL container. API auto-migrates on startup.
- Swagger: always document endpoints with XML comments. View docs at http://localhost:8080/scalar/v1

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Tests

- Tests run with a single command: `<project-specific>`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Testing instructions

- If there are preexisting tests, update them to reflect the changes you made, even if nobody asked.
- Setup: Create `API.Tests.csproj` with xUnit or NUnit for unit tests. Use Moq for mocking.
- Run: `dotnet test` from root or `dotnet test API.Tests/API.Tests.csproj` for specific project.
- Focus: Use test class name filter: `dotnet test --filter "ClassName"` or `dotnet test --logger "console;verbosity=detailed"`
- Repositories: Mock `IRepository` interfaces. Inject via dependency injection.
- Services: Test business logic isolated from DB. Mock repositories. Test edge cases (null, empty lists, validation).
- Controllers: Test endpoint responses, status codes, error handling. Mock services.
- Coverage: Use OpenCover or Coverlet: `dotnet add package coverlet.collector` then `dotnet test /p:CollectCoverage=true`
- Before commit: Run `dotnet test` + `dotnet build` — fix warnings/errors until all green.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Structure

- Follow the framework's convention (.NET, Spring, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Formatting

- Use the language default formatter (`gofmt`, `prettier`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.

## PR instructions

- Title format: <feat/fix/refactor>/<short-description> (kebab-case)
- Description: Brief summary of changes, relevant context if strictly necessary.

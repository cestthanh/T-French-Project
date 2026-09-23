# API smoke tests

The repository also contains self-hosted .NET integration tests for the newer
Course/Class/Enrollment and Quiz workflows. They create an isolated temporary
SQLite database, start the API in memory, and require no separately running
server:

```bash
cd backend
dotnet test TFrench.sln
```

These tests cover free/paid enrollment, lead conversion, one-attempt quiz
creation and submission, answer secrecy, optimistic autosave versioning,
automatic deadline submission, automatic objective grading, and manual essay grading.

End-to-end checks against a **running** API. They log in as the seeded accounts,
make real HTTP requests, and assert on status codes.

That is deliberate: what these suites check is *authorisation*, which is a
property of the whole request pipeline — JWT parsing, role claims, the
`[Authorize]` attributes, and the controller's own checks all have to line up.
A unit test on a controller method would mock away most of what can actually go
wrong.

## Running them

Start the API, then run the suites:

```bash
# terminal 1
cd backend/TFrench.API && dotnet run

# terminal 2
cd backend/tests && ./run-all.sh
```

`run-all.sh` exits non-zero if any suite fails, so it drops straight into CI.

The default base URL is `http://localhost:5083/api`, matching the `http` profile
in `Properties/launchSettings.json`. Override it for any other port:

```bash
API_BASE=http://localhost:5199/api ./run-all.sh
```

Individual suites run the same way: `./files.sh`, `./leads.sh`, `./blog.sh`.

## What each suite covers

| Suite | Checks |
|---|---|
| `files.sh` | Upload validation (type, size, anonymous). Every branch of `FilesController.CanAccessAsync`: public material, course material, assignment briefs, and submissions. Cross-user file claims. Enrolment required to submit. The assignment detail payload leaking neither password hashes nor other students' marks. |
| `leads.sh` | Anonymous submission, validation, the repeat guard, and every admin-only route refusing a student, a teacher, and an anonymous caller. Status/stats/filter workflow. |
| `blog.sh` | Create, duplicate slugs on both create and update, the edit payload, `PublishedAt` staying put across an edit, and teacher access refused throughout. |

## Requirements

`bash` and `curl`. Nothing else — no `jq`, because it is not installed
everywhere this has to run. Responses are picked apart with `sed`, which is
enough for these fixtures and is not trying to be a JSON parser.

## They are idempotent

Every suite can be run repeatedly against the same database. Each run registers
its own users with a PID-suffixed email and cleans up the records it created.

This matters more than it sounds. An earlier version reused the seeded student
to test submission privacy; on a second run the "already submitted" conflict
left the uploaded file attached to nothing, the teacher was refused *correctly*,
and the suite failed for entirely the wrong reason.

## Adding a check

Helpers live in `lib.sh`:

```bash
check "label" "<expected>" "<actual>"          # records PASS/FAIL
status -X POST "$API/thing" -H "..."           # status code only
token user@example.com Password@123            # bearer token, or empty
register <email> <password> <full name>
pubid "$json"   rowid "$json"                  # pull an id out of a response
```

Finish the file with `summary`, which prints the totals and sets the exit code.

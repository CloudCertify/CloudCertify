# 0012 — A closed Service vocabulary with parents, built in the pipeline

- Status: Accepted
- Date: 2026-09-05
- Related: ADR 0008 (Drill Mix), README V2 (Per-Service performance,
  Weighted quiz generation),
  [Canonical Service vocabulary](https://github.com/CloudCertify/CloudCertify/issues/88)

## Context

`Question.Services` is a free-text `string[]` filled during enrichment. Across
the eleven shipped banks it holds 199 distinct strings, and they do not name
199 services.

Three separate causes, none of them the model's fault.

The in-scope parser drops the parenthetical. `3-enrich.ts` reads a guide bullet
as `line.split('(')[0]`, so `Amazon Simple Storage Service (Amazon S3)` yields
the long name and throws away the short one. AWS writes the guides
inconsistently: CLF lists `Amazon S3`, SAP lists
`Amazon Simple Storage Service (Amazon S3)`, ANS lists both as separate
bullets. The result is `Amazon S3` (377 questions) and
`Amazon Simple Storage Service` (27) as two services, plus twenty more pairs
like it: `IAM` / `AWS Identity and Access Management`, `AWS KMS` /
`AWS Key Management Service`, `Amazon EBS` / `Amazon Elastic Block Store`.

Nothing validates what comes back. Enrichment deliberately does not enforce the
in-scope list, on the grounds that the list is lossy and the model legitimately
names services absent from it. True, and it is also how
`Amazon EC2 security groups`, `NAT Gateway` / `NAT gateway` / `NAT gateways`,
and 50 single-occurrence strings got in.

The guides list features under service headings. `VPC endpoints`,
`VPC peering`, `VPC Flow Logs`, `Internet gateways`, `Network ACLs`,
`Elastic IP addresses`, `Application Load Balancer` and `Savings Plans` are all
in the banks as services. They are parts of services.

None of this matters while nothing reads the field. V2 has two features that
do: Per-Service performance, and weighted quiz generation that takes the same
signal as input. A per-service table renders one row per string, so today it
would show S3 twice and NAT gateways three times.

Sparsity is the other half of the problem. On CLF, 834 questions carry 94
distinct services; 25 of them appear exactly once and 28 appear two to four
times. After one 65-question exam only two services clear an eligibility floor
of five. Rolling up to `ServiceCategory` would fix the density (16 categories,
every question carries one) but it is the wrong axis: "you are weak on Compute"
is a Domain restated, and weighted generation cannot draw a useful drill from
it.

## Decision

1. **A registry file is the closed vocabulary.** One entry per service, shared
   across every exam, checked into the pipeline and shipped alongside the
   banks. Entries are hand-curated and never regenerated, because the ids are
   referenced by data.

2. **Banks carry codes, not names.** `Question.Services` holds registry ids
   (`s3`), and the registry holds the display name. A rename is a one-line edit
   instead of a rewrite of 3600 questions, and a typo cannot invent a service.

3. **An entry may declare a parent.** A question is tagged with the most
   specific id that applies, and any fold counts it toward that service and
   every ancestor. A Glacier question counts in the Glacier row and the S3 row.
   `Question.Services` is already an array, so fan-out exists either way.

4. **Sub-services keep their identity.** `Amazon Aurora`, `Amazon S3 Glacier`,
   `Amazon RDS Proxy`, `Amazon CloudWatch Logs` and the VPC feature cluster
   stay real services with parents, rather than being merged away. Merging is
   destructive; a parent link is not.

5. **Parent assignments that the name does not give away.** Security groups
   parent to VPC, not EC2, because they are tested with Network ACLs. Auto
   Scaling is one parent absorbing `AWS Auto Scaling`,
   `Amazon EC2 Auto Scaling` and `Amazon Aurora Auto Scaling`, roughly 97
   questions, because a learner treats it as one topic and splitting it across
   EC2 and a standalone row hides it in both.

6. **Aliases collapse, spellings do not survive.** `IAM` and
   `AWS Identity and Access Management` are one entry with one id. The guide
   parser keeps the parenthetical and resolves both forms through the registry.

7. **An unregistered service name fails the build.** The vocabulary is closed
   or it is not. Adding a line to the registry when a new exam introduces a
   real service is cheap; letting drift back in is not.

8. **Existing banks are remapped, not re-enriched.** A deterministic pass
   rewrites `services` from the registry. No model calls. The 138 CLF questions
   carrying no service stay untagged: sampling them shows concept questions
   about pricing models, the Well-Architected Framework and partner programs,
   which name no service to tag.

9. **`ServiceCategory` is untouched.** It drifts the same way, `soa-c03` says
   "Network and Content Delivery" where CLF says "Networking and Content
   Delivery", but Progress covers one Quiz at a time so the two spellings never
   appear together. It also cannot be derived from the service, since the 138
   untagged CLF questions all carry a category.

## Consequences

Reseeding rewrites every question row, because `QuizCatalogSeeder` compares a
hash of the bank and `ReplaceQuestions` deletes before it inserts. Question ids
churn and any existing Outcome history detaches. Accepted deliberately: the app
has no real users yet. This gets more expensive every month it waits.

Bank files stop being readable at a glance. `["s3", "s3-glacier"]` needs the
registry to interpret. That is the price of codes and it is paid by whoever
hand-edits a chunk.

A wrong parent is silent. It moves questions between rows and nothing fails, so
the registry needs eyeballing once at review time, and merges should be
conservative.

The tree is reversible. Deleting every `parent` key leaves a flat vocabulary
with no data migration, which is why it is safe to commit to now rather than
after the V2 page exists.

Per-Service Standing gets two levels to render: top-level services by default,
children on expansion when they have enough questions. Small standalone
services keep their rows and stay hidden under the eligibility floor until a
bank grows, rather than being dropped from the data.

## Considered and rejected

- **Rolling the second axis up to `ServiceCategory`.** Denser, and every
  question carries one, so the page would look healthy on day one. Rejected:
  16 categories are a restatement of Domain, and weighted generation needs a
  target specific enough to draw a drill from. "Weak on Compute" is not one.
- **A flat vocabulary with aggressive merging.** Glacier into S3, Aurora into
  RDS, VPC endpoints into VPC. Fewer rows, faster to fill, and it destroys the
  distinction permanently in the data. The parent link buys the same rollup and
  keeps the leaf.
- **An alias map in the API, applied at fold time.** Puts data cleaning in the
  read path, cannot fail a build, and has to be maintained against a bank it
  cannot see.
- **Fixing the parser only.** Collapses the `Amazon S3` pair and nothing else.
  Casing variants, feature names and free-text leakage all survive, because
  nothing validates the model's output.
- **Warning on an unknown service instead of failing.** A warning in a pipeline
  nobody watches is a permanent unknown.
- **Re-enriching to fill the 138 untagged CLF questions.** Thousands of model
  calls to chase a 17% coverage gap that the sample says is mostly real: those
  questions have no service in them.
- **Dropping the long tail from the banks.** The 25 single-occurrence CLF
  services would lose their only tag. Keeping them costs nothing, since the
  page hides a row until it clears the floor.
- **Generating the registry from the guides on every run.** Ids would move
  whenever AWS edits a guide, and ids are referenced by data.

## ADDED Requirements

### Requirement: Generated offline idiom corpus
The application SHALL ship the idiom corpus as generated source data produced by a build-time script, not fetched at runtime. Each entry SHALL carry the idiom surface form and a frequency tier. The generated module SHALL record its source dictionary, edition, and generation date as a comment.

#### Scenario: Corpus is available offline
- **WHEN** the application starts with no network connection
- **THEN** the full idiom corpus is available from the bundled module

#### Scenario: Generation is reproducible
- **WHEN** the build script is run twice against the same inputs
- **THEN** it produces byte-identical output

### Requirement: Four-character entries only
Every corpus entry SHALL consist of exactly four characters. The build script SHALL reject any source row that is not exactly four characters rather than truncating or padding it, and SHALL report the count of rejected rows.

#### Scenario: Non-conforming rows are rejected
- **WHEN** a source row contains three or five characters
- **THEN** the row is excluded from the generated corpus and counted in the rejection report

#### Scenario: Corpus validation runs in tests
- **WHEN** the corpus test suite runs
- **THEN** it asserts that every entry has length four and that no duplicate surface form exists

### Requirement: Frequency tiers rank without extending
Frequency data SHALL be used only to assign tiers to entries that already exist in the dictionary corpus. The build script SHALL NOT add an entry that is absent from the dictionary corpus, regardless of its frequency rank. Entries that cannot be aligned to frequency data SHALL be assigned the lowest tier rather than dropped.

#### Scenario: Frequency list cannot introduce entries
- **WHEN** the frequency source contains an idiom absent from the dictionary corpus
- **THEN** that idiom does not appear in the generated corpus

#### Scenario: Unaligned entries are retained
- **WHEN** a dictionary entry has no frequency match
- **THEN** it is retained in the corpus at the lowest tier

#### Scenario: Alignment rate is reported
- **WHEN** the build script completes
- **THEN** it reports the proportion of dictionary entries that were successfully aligned to frequency data

### Requirement: Licence attribution and text integrity
`THIRD_PARTY_NOTICES.md` SHALL record the dictionary's original author, maintaining institution, edition, and licence. Any dictionary text displayed in the application SHALL be reproduced verbatim; the application SHALL NOT abridge, paraphrase, summarise, or reword it.

#### Scenario: Attribution is present
- **WHEN** the corpus is generated from the dictionary
- **THEN** the third-party notices file names the author, maintaining institution, edition, and licence

#### Scenario: Definition text is not altered
- **WHEN** a definition is displayed and is longer than the available space
- **THEN** the container scrolls or expands and the text remains complete and unmodified

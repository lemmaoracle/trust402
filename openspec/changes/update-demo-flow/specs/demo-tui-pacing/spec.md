## ADDED Requirements

### Requirement: Keypress-gated pause
The system SHALL provide a `waitForKeypress` function that displays a "Press any key to continue" prompt and blocks execution until the user presses any key. The prompt text SHALL be configurable via a parameter.

#### Scenario: User presses a key
- **WHEN** `waitForKeypress("Continue to next step")` is called
- **THEN** the system displays "Continue to next step — Press any key to continue" and waits until stdin receives a keypress

#### Scenario: Keypress received
- **WHEN** the user presses any key after the prompt
- **THEN** the function resolves and the demo flow continues to the next phase

### Requirement: Typewriter text streaming
The system SHALL provide a `typewriter` function that displays text one character at a time with a configurable delay between characters. The default delay SHALL be approximately 100ms (0.1s) per character.

#### Scenario: Text streams character by character
- **WHEN** `typewriter("Hello World")` is called with default 100ms delay
- **THEN** each character of "Hello World" appears on stdout one by one, with approximately 100ms between each character

#### Scenario: Custom delay
- **WHEN** `typewriter("Fast text", { delay: 50 })` is called
- **THEN** each character appears with approximately 50ms delay between characters

### Requirement: Async spinner
The system SHALL provide an `asyncSpinner` function that displays a spinning ASCII animation while an async operation is in progress, replacing it with the result (or an error indicator) when the operation completes. The spinner frames SHALL cycle through Braille pattern characters (e.g., `⠋` `⠙` `⠹` `⠸` `⠼` `⠴` `⠦` `⠧` `⠇` `⠏`).

#### Scenario: Spinner during async operation
- **WHEN** `asyncSpinner("Fetching data...", fetchOperation)` is called
- **THEN** the system displays a spinning Braille animation next to "Fetching data..." until `fetchOperation` resolves

#### Scenario: Spinner on success
- **WHEN** the async operation resolves successfully
- **THEN** the spinner stops and the text transitions to show the success status

#### Scenario: Spinner on error
- **WHEN** the async operation rejects
- **THEN** the spinner stops and the text transitions to show an error indicator

# Privacy Policy for AI Sidebar Page Context

Effective date: September 25, 2026

AI Sidebar Page Context adds page content from the active tab to questions sent through the Firefox AI sidebar.

## Data processed by the extension

When you send a question starting with @page or @page+, the extension processes:

- The title of the active tab
- Page content extracted from the active tab (using Reader Mode or innerText)
- Your question

The extension does not include the page URL in the prompt.

## How data is used

The extension uses this data only to prepare the prompt you request. Page extraction and prompt preparation run locally in Firefox.
The extension then submits the prompt through the web interface of the provider selected in the Firefox AI sidebar.

Supported providers include:

- Anthropic Claude
- ChatGPT
- Google Gemini
- Mistral Vibe
- Copilot
- HuggingChat

## When data is transmitted

The extension transmits data only when you:

1. Type @page or @page+ on the first line of a message.
2. Enter your question.
3. Send the message.

The extension ignores ordinary sidebar messages that do not use these directives.

## Data collection by the developer

The developer does not collect or receive page content, questions, account information, or usage data.

The extension has no:

- Analytics or telemetry
- Advertising or tracking
- Developer-operated servers
- Remote code
- Persistent storage for page content or questions
- Cookies, browsing history, or clipboard access

## Data retention

The extension does not store page content or questions.

After the extension submits a prompt to an AI provider, that provider handles the data under its own terms and privacy policy. Review the privacy policy of your selected provider before sending sensitive or confidential information.

## Private browsing

The extension is disabled in private browsing windows.

## Changes to this policy

This policy may change if the extension's features or data handling change. Material changes will appear in the project repository and in the updated effective date. 

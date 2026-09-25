# AI Sidebar Page Context

## English

Ask questions about the active tab from the Firefox AI sidebar.

AI Sidebar Page Context includes the active tab's page content with your question. When you start your message with @page, the extension extracts the page content, prepares the prompt, and submits it to the selected provider.

### How to use

1. Open the page you want to ask about.
2. Open the Firefox AI sidebar.
3. Type @page on the first line, then enter your question.
4. Send the question.

Example:
```
@page
Summarize the main points of this article.
```

Use @page+ to force extraction with innerText. This can help if Reader Mode leaves out content you need.

### Supported providers

- Anthropic Claude
- ChatGPT
- Google Gemini
- Mistral Vibe
- Copilot
- HuggingChat

The extension trims page content to fit the selected provider's limit. If the content exceeds the limit, the extension sends as much content as fits and displays a notification.

### Privacy

The extension activates only when a message starts with @page or @page+. It ignores all other sidebar messages.
Page extraction and prompt preparation run locally in Firefox. When you send the question, the extension submits the active tab's title, extracted page content, and your question to the provider's web interface. The prompt does not include the page URL.

The extension contains no analytics, telemetry, advertising, or remote code, and operates without external servers. It does not store page content, questions, or account data.

For more details, see the [Privacy Policy]().

### Requirements

- Firefox 142 or later
- Firefox AI sidebar enabled
- A configured AI provider in the sidebar

This extension works on desktop Firefox. It does not support private browsing.


## Japanese

Firefox AI サイドバーから、アクティブなタブに関する質問を行えます。

AI Sidebar Page Context は、アクティブなタブのページコンテンツを質問に付加して送信します。メッセージの先頭に @page と入力すると、本拡張機能がページコンテンツを抽出し、プロンプトを作成して、選択されたプロバイダーへ送信します。

### 使用方法

1. 質問対象のページを開きます。
2. Firefox AI サイドバーを開きます。
3. 1 行目に @page と入力し、続けて質問を入力します。
4. 質問を送信します。

入力例:
```
@page
この記事の要点を要約してください。
```

innerText による抽出を強制する場合は @page+ を使用してください。リーダーモードで必要なコンテンツが抽出されない場合に有効です。

### 対応プロバイダー

- Anthropic Claude
- ChatGPT
- Google Gemini
- Mistral Vibe
- Copilot
- HuggingChat

本拡張機能は、選択されたプロバイダーの文字数上限に合わせてページコンテンツを切り詰めます。上限を超過した場合は、上限までのコンテンツを送信し、通知を表示します。

### プライバシー
本拡張機能は、メッセージが @page または @page+ で始まる場合にのみ動作します。これらを含まないサイドバーの通常メッセージは一切処理しません。
ページの抽出およびプロンプトの作成処理は、すべて Firefox 内でローカルに実行されます。質問を送信すると、アクティブなタブのタイトル、抽出されたページコンテンツ、および入力された質問のみがプロバイダーのウェブインターフェースへ渡されます。プロンプトにページの URL は含まれません。

本拡張機能にはアナリティクス、テレメトリー、広告、リモートコードは含まれておらず、外部サーバーとも通信しません。ページコンテンツ、質問内容、アカウント情報などを保存することもありません。

詳細は [Privacy Policy]() を参照してください。

### 動作要件

- Firefox 142 以降
- Firefox AI サイドバーが有効であること
- サイドバー内で AI プロバイダーが設定されていること

本拡張機能はデスクトップ版 Firefox で動作します。プライベートブラウジングには対応していません。 

# Web AI Agent - Implementation Plan

*Available Translations / 歷史版本與翻譯:*
- [繁體中文實作計劃書 (Chinese version)](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/plans/implementation_plan_zh.md)
- [English Implementation Plan (English version)](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/plans/implementation_plan_en.md)

We will build a responsive Web AI Agent utilizing the Google Gemini API. The app will feature a warm and inviting design with frosted-glass effects, support text chat with full Markdown rendering, image/file attachment, and dual-mode voice inputs.

## User Review Required

> [!IMPORTANT]
> **API Key Safety & Browser Settings**:
> The application runs entirely client-side. The Gemini API Key and settings (including chat history) will be stored locally in the browser's `localStorage`. No server-side components will store or capture this data.

## Open Questions
No open questions. We have aligned on:
- React + TS + Vite framework.
- Warm, bright, and relaxing frosted-glass visual theme (RWD-ready).
- Dual-mode voice input (Speech-to-Text or direct audio recording attachment).
- Dynamic model listing directly from the Gemini API.
- LocalStorage persistence for both settings and chat history.

---

## Proposed Changes

We will initialize a new React + TypeScript project with Vite, install the required packages, and implement a beautifully structured interface.

### Project Setup & Dependencies

We will initialize Vite in the current folder:
```bash
npx -y create-vite@latest ./ --template react-ts --no-interactive
```

And install the following dependencies:
- `@google/generative-ai`: Official client library for Gemini API.
- `lucide-react`: Modern icons for chat controls, settings, and media attachments.
- `react-markdown`: For rendering Markdown messages.
- `remark-gfm`: Markdown plugin for GitHub Flavored Markdown (tables, lists, etc.).

---

### UI Components

#### [NEW] [index.css](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/index.css)
Configure a warm-tone design system with CSS custom properties:
- Background: Warm cream (`#fefcf8` / `#faf5ec`)
- Accents: Warm coral (`#ff7a59`), soft terracotta (`#d96b52`), amber (`#f7c873`)
- Text: Deep charcoal-brown (`#3e352f`), muted brown (`#706257`)
- Glassmorphism: `backdrop-filter: blur(12px) saturate(190%)`, transparent light borders (`rgba(255, 255, 255, 0.4)`), soft warm shadows.
- Custom scrollbars, input focus rings, and transition micro-animations.

#### [NEW] [GeminiService.ts](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/services/GeminiService.ts)
A helper class/file to encapsulate calls to the Gemini API:
- `fetchModels(apiKey: string)`: Calls the models endpoint (`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`) and filters for models supporting `generateContent`.
- `sendMessage(config)`: Sends a request to Gemini containing the system instruction, chat history, and current message (text, files, and audio).

#### [NEW] [Sidebar.tsx](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/components/Sidebar.tsx)
- Contains API Key configuration input, model selector (populated dynamically), and system instruction textarea.
- Lists session history or settings toggles.
- Supports collapsible behavior for mobile RWD with a warm drawer overlay.

#### [NEW] [ChatArea.tsx](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/components/ChatArea.tsx)
- Displays message lists.
- Renders User and Agent messages using `react-markdown` + `remark-gfm`.
- Highlights attachments (images, audio cards).
- Implements auto-scrolling to the latest message.

#### [NEW] [InputArea.tsx](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/components/InputArea.tsx)
- Text input box supporting multiline input.
- File attachment button: lets user select images (`image/*`) or generic documents.
- Dual-mode Voice Input:
  - **Speech-to-Text Button**: Uses `webkitSpeechRecognition` to dictate text into the input box.
  - **Audio Recording Button**: Uses `MediaRecorder` to record audio, saving it as a list of attachments.
- Visual display of pending attachments (image preview, audio recording status).

#### [MODIFY] [App.tsx](file:///Users/ckny/Documents/02.Projects/ai-class-examples/ag-course-web-agent-base/src/App.tsx)
- App layout coordinator holding core states (messages, API Key, selected model, custom system prompt, UI toggles).
- Reads and updates settings in `localStorage`.

---

## Verification Plan

### Automated Verification
We will verify that the React app compiles and builds successfully:
- `npm run build` to ensure no TypeScript compilation or bundling errors.

### Manual Verification
1. **Settings Verification**: Test entering an API key, fetching models dynamically, selecting a model, setting a custom system prompt, and verifying the settings persist across page reloads.
2. **Text Chat & Markdown**: Ask standard questions, math equations, code blocks, and markdown tables to verify visual rendering.
3. **Multimodal Files**: Upload a PNG/JPG or PDF file, ask Gemini to describe it, and verify correct processing.
4. **Voice Dual-Mode**:
   - Verify speech-to-text dictation types into the text area.
   - Verify audio recording attaches a playable audio clip, sends it to Gemini, and Gemini answers based on the audio clip.
5. **Responsive Design (RWD)**: Toggle mobile emulation in Chrome DevTools to ensure the warm glassmorphism UI scales correctly, sidebar turns into a overlay drawer, and layout remains comfortable and beautiful.

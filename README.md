# 課程範例：AI Agent 對話介面
本範例示範以最簡單、直覺的方式，建立一個 AI Agent 對話介面。

## 下載範例檔案

* [示範網站](https://gears.tw)
* [露營裝備租賃價目表 (PDF)](./docs/露營裝備租賃價目表.pdf)
* [露營出租商品表 (CSV)](./docs/露營出租商品表.csv)
* [露營出租商品表 (Markdown)](./docs/露營出租商品表.md)
* [服務條款](./docs/service_policy.md)

## 提示詞範例

```text
/grill-me 幫我利用 Gemini API 建立一個 Web AI Agent，支援以下功能：
1. 文字訊息對談，可詢問各類問題，Agent 提供回應。回應應支援完整的 markdown 顯示。
2. 圖片、檔案輸入
3. 語音輸入

請提供一個設定介面，供使用者設定 API KEY，系統提示詞，語言模型等
語言模型應透過 API 取得
切勿從你的記憶庫提取
```

| 功能 / 術語 | 說明 |
| :--- | :--- |
| **/grill-me** | 這是 Antigravity 官方的 skill，用來取代 plan mode，使用這個模式時，Agent 會仔細詢問你的需求，並幫你制定開發計劃。 |
| **系統提示詞** | 這是 Agent 的核心設定，可以用來定義 Agent 的角色、行為、回應方式等。 |
| **API KEY** | 這是 Agent 與外部服務互動的憑證，可以用來設定 Gemini API 等。 |
| **語言模型** | 這是 Agent 的大腦，可以用來設定 Gemini API 等。 |
| **圖片、檔案輸入** | 這是 Agent 與外部服務互動的憑證，可以用來設定 Gemini API 等。 |
| **語音輸入** | 這是 Agent 與外部服務互動的憑證，可以用來設定 Gemini API 等。 |

## 如何安裝、運行此範例

本專案使用 [Node.js](https://nodejs.org/) 作為 JavaScript 執行環境，[npm](https://www.npmjs.com/) 作為套件管理工具，[React](https://react.dev/) 作為 UI 框架，[Vite](https://vite.dev/) 作為開發伺服器與建置工具。

### 前置需求

-   **Node.js**：[下載與安裝](https://nodejs.org/)
-   **Git**：[下載與安裝](https://git-scm.com/downloads)


### 安裝相依套件

```bash
npm install
```

### 運行開發伺服器

```bash
npm run dev
```

運行後，打開瀏覽器並訪問 `http://localhost:5173` (預設埠號)。

### 運行建置

```bash
npm run build
```

建置完成的檔案將輸出在 `dist/` 資料夾。

### 預覽建置結果

```bash
npm run preview
```

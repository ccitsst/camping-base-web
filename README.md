# 課程範例：AI Agent 對話介面
本範例示範以最簡單、直覺的方式，建立一個 AI Agent 對話介面。

## 下載範例檔案

* [示範網站](https://gears.tw)
* [露營裝備租賃價目表 (PDF)](./docs/露營裝備租賃價目表.pdf)
* [露營出租商品表 (CSV)](./docs/露營出租商品表.csv)
* [露營出租商品表 (Google Sheet)](https://docs.google.com/spreadsheets/d/e/2PACX-1vRshojqbRnT4QAMdMg-JlyaG969mUcNtP9Q_iV2nXETyIca8Sek0UhfunjM_BSR9Q/pub?output=csv)
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


## 課堂上可能用到的提示詞整理

### PDF 轉 Markdown

```text
幫我將商品以 markdown 格式整理成清單，存到 ./data/products.md，參考下列格式:

# 藍山PRO2 輕量雙人帳
- 編號: #UT001
- 規格: 帳篷 / 非自立帳(需2支登山杖) / 雙人帳
- 品牌: 三峰出
- 租金: 490 + 100 / 日
- 押金: 1,000
```


### 採用 CSV

```text
分析底下 CSV 文件格式，作為資料結構定義參考，然後在 Agent 設定增加一個資料來源設定，方便我填入 Google Sheet CSV 來作為即時商品資料參考。

Google Sheet 連結：[貼上連結]
```

### 將政策文件做成 Embedding 向量

```text
/grill-me 將 ./docs/service_policy.md 政策文件轉成 rAG 向量資料庫。
1. 準備轉換 script 讓我預先處理資料轉換。
    * 使用 gemini-embedding-2 模型
    * 並存到 ./src/data/service_policy.embedding 向量
2. 增加 npm script policy:convert，負責執行轉換script。
3. 準備 .env 檔案，存放轉換期間的 API_KEY。
4. 將 .env 加入 .gitignore
5. 為 Agent 增加查詢政策所需的 Tool Functions
6. 技術細節由你決定，有設計功能或商業決策問題再問我。
```

## 課堂提及的參考資源

* [Gemini 開發 必裝技能](https://github.com/drgarbage/ag-course-index/blob/main/docs/guides/gemini-api-skill-and-mcp.md)
* [Skill 商城](https://skillsmp.com/)
    * [pdf-to-markdown](https://skillsmp.com/creators/azure-samples/python-agentframework-demos/github-skills-pdf-to-markdown) : 將 PDF 轉換成 Markdown 檔案的 skill。
    * [frontend-design](https://skillsmp.com/creators/anthropics/skills/skills-frontend-design) : 提供前端 UI 設計建議。
<p align="center">
  <a href="https://www.gatsbyjs.com">
    <img alt="Gatsby" src="https://www.gatsbyjs.com/Gatsby-Monogram.svg" width="60" />
  </a>
</p>

<p align="center">
  <a href="./README.md">ENGLISH</a> | <strong>繁體中文（臺灣）</strong>
</p>

<h1 align="center">
  用於建立 Gatsby 主題工作區的起始專案
</h1>

```shell
gatsby new my-theme https://github.com/gatsbyjs/gatsby-starter-theme-workspace
cd my-theme
yarn workspace example develop
````

---

## 專案結構

```text
.
├── README.md
├── README.TW.md
├── gatsby-theme-minimal
│   ├── README.md
│   ├── gatsby-config.js
│   ├── index.js
│   └── package.json
├── example
│   ├── README.md
│   ├── gatsby-config.js
│   ├── package.json
│   └── src
├── package.json
└── yarn.lock

3 個資料夾，10 個檔案
```

---

## `gatsby-theme-minimal`

此資料夾本身就是 **主題套件本體**。
你應該在某個時間點將它重新命名為：

```
gatsby-theme-{你的主題名稱}
```

同時請一併修改以下設定以保持一致：

* `gatsby-theme-minimal/package.json` 中的 `name` 欄位
* `example` 目錄中的：

  * `package.json`
  * `gatsby-config.js`

確保相依套件名稱與主題名稱一致。

### 目錄內容說明

* `gatsby-theme-minimal/`

  * `gatsby-config.js`
    一個空的 Gatsby 設定檔，可作為你開始為主題加入功能的起點。
  * `index.js`
    由於主題同時也被視為 Plugin，Gatsby 需要這個檔案才能將你的主題當作外掛(Plugin)載入，即使內容是空的也必須存在。
  * `package.json`
    定義當使用者安裝你的主題時，會一併安裝的相依套件。
  

  ⚠️ **注意：`gatsby` 應該設定為 `peerDependency`。**

---

## `example`

此資料夾是一個 **實際使用主題的範例網站**。
它應該長得與「從 npm 安裝並使用你主題的一般使用者網站」完全相同。

### 目錄內容說明

* `example/`

  * `gatsby-config.js`
    指定要使用的主題，以及該網站可能需要的其他一次性設定。
  * `src/`
    網站的原始碼，例如：

    * 單頁頁面
    * 客製元件
    * 只屬於該站台的程式碼

---

## 執行範例網站

你可以使用以下指令啟動範例站台進行開發與測試：

```shell
yarn workspace example develop
```

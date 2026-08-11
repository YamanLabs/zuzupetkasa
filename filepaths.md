# Project Directory Structure: `nextjs-kasa`

```
nextjs-kasa/
| - 
│   
│       
│           
├── electron/
│   ├── database.js
│   ├── main.js
│   ├── pos_terminal.js
│   └── preload.js
├── public/
│   ├── favicon.ico
│   ├── file.svg
│   ├── globe.svg
│   ├── icon.ico
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── xuxu_logo.png
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AIStockTab.tsx
│   │   ├── AlertsTab.tsx
│   │   ├── ProductsTab.tsx
│   │   ├── RefundsTab.tsx
│   │   ├── ReportsTab.tsx
│   │   ├── SalesTab.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── aistock/
│   │   │   ├── AIDoubleCheckModal.tsx
│   │   │   ├── AIParsedTable.tsx
│   │   │   ├── AIRulesModal.tsx
│   │   │   └── AIUploadGallery.tsx
│   │   ├── products/
│   │   │   ├── ProductModal.tsx
│   │   │   ├── ProductsHeader.tsx
│   │   │   └── ProductsTable.tsx
│   │   ├── sales/
│   │   │   ├── SalesCart.tsx
│   │   │   ├── SalesPaymentModal.tsx
│   │   │   └── SalesProductTable.tsx
│   │   └── settings/
│   │       ├── SettingsAI.tsx
│   │       ├── SettingsCategories.tsx
│   │       ├── SettingsCompany.tsx
│   │       ├── SettingsNavigation.tsx
│   │       ├── SettingsPOS.tsx
│   │       └── SettingsSystem.tsx
│   ├── hooks/
│   │   ├── useAIAnalysis.ts
│   │   ├── useAIDoubleCheck.ts
│   │   ├── useAIRules.ts
│   │   ├── useCart.ts
│   │   ├── useCheckout.ts
│   │   ├── useProductSearch.ts
│   │   ├── useProducts.ts
│   │   └── useSettings.ts
│   └── lib/
│       ├── barcode-scanner.ts
│       ├── ipc.ts
│       ├── receipt-printer.ts
│       └── sound-effects.ts
├── .gitignore
├── electron-builder.json
├── eslint.config.mjs
├── gmp3-server.js
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── server.js
├── skills-lock.json
└── tsconfig.json
```

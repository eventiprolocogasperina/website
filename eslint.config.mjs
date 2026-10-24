import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 esporta già configurazioni flat: FlatCompat non serve più
// (andava in errore con "Converting circular structure to JSON").
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Codice precedente al rifacimento: queste regole segnalano centinaia di casi che verranno
    // sistemati quando i file vengono riscritti (fasi 2-4). Restano avvisi, non errori.
    // Il codice nuovo (src/server, src/lib/{money,dates,codes}.ts, ecc.) non rientra qui.
    files: ["src/app/**", "src/components/**", "src/lib/data/**", "src/lib/tickets/**", "src/lib/pdf/**",
      "src/lib/printer/**", "src/lib/manuals/**", "src/lib/telegram.ts", "src/lib/generatePDF.ts", "src/lib/cropImage.ts"],
    ignores: ["src/components/ui/*.ts", "src/components/ui/{Avatar,Badge,BulkActionBar,Button,Card,Checkbox,Combobox,ConfirmDialog,ContextualSaveBar,DataTable,DatePicker,Dialog,DropdownMenu,EmptyState,Field,FilterBar,IconButton,Input,Kbd,KeyValue,Layouts,MoneyInput,PageHeader,Popover,RadioGroup,Select,Sheet,Skeleton,Stat,StatusBadge,Switch,Tabs,Timeline,Toast,Tooltip}.tsx", "src/app/admin/%5Fui/**", "src/components/errors/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/legacy/**", "dev/**", "drizzle/**"]),
]);

export default eslintConfig;

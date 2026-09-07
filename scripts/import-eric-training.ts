import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const files = fs
  .readdirSync(process.cwd())
  .filter((file) =>
    file.toLowerCase().endsWith(".xlsx")
  );

if (files.length === 0) {
  throw new Error(
    "Hittar ingen .xlsx-fil i projektets rot."
  );
}

if (files.length > 1) {
  console.log(
    "⚠️ Flera Excel-filer hittades:"
  );

  for (const file of files) {
    console.log(`- ${file}`);
  }

  throw new Error(
    "Lämna bara den Excel-fil som ska importeras i projektets rot."
  );
}

const excelFile = files[0];
const excelPath = path.join(
  process.cwd(),
  excelFile
);

console.log("");
console.log(
  "🏃 Coach Hiding – Excel dry run"
);
console.log("");
console.log(
  `📄 Fil: ${excelFile}`
);
console.log("");

const workbook = XLSX.readFile(
  excelPath,
  {
    cellDates: false,
    raw: true,
  }
);

console.log(
  `📚 Antal flikar: ${workbook.SheetNames.length}`
);
console.log("");

for (
  const sheetName of workbook.SheetNames
) {
  const sheet =
    workbook.Sheets[sheetName];

  const rows =
    XLSX.utils.sheet_to_json<
      unknown[]
    >(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });

  console.log(
    "────────────────────────────────────"
  );

  console.log(
    `📑 Flik: ${sheetName}`
  );

  console.log(
    `   Rader: ${rows.length}`
  );

  console.log("");

  const previewRows =
    Math.min(rows.length, 15);

  for (
    let i = 0;
    i < previewRows;
    i++
  ) {
    const row = rows[i] ?? [];

    const values = row
      .map((value, index) => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        return `${index}: ${String(value)}`;
      })
      .filter(Boolean);

    if (values.length) {
      console.log(
        `Rad ${i + 1}:`
      );

      console.log(
        "  " +
          values.join(" | ")
      );
    }
  }

  console.log("");
}

console.log(
  "────────────────────────────────────"
);

console.log("");
console.log(
  "✅ Dry run klar."
);
console.log(
  "Ingen data har skrivits till Supabase."
);
console.log("");
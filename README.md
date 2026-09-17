# UMKMHub

## Menjalankan API

Dari root repository, jalankan `pnpm start:dev`. Dari `apps/api`, perintah yang
sama menjalankan Nest secara langsung.

API menggunakan ES modules: pertahankan `"type": "module"` di
`apps/api/package.json` bersama `module: nodenext` di konfigurasi TypeScript.
Menghapus pengaturan tersebut bisa menghasilkan output CommonJS yang tidak
cocok dengan Prisma client dan error `exports is not defined in ES module scope`.
Gunakan ekstensi `.js` pada import relatif di source TypeScript (contoh:
`import { StoresService } from './stores.service.js'`). Setelah mengubah
konfigurasi modul, hentikan proses dev dengan Ctrl+C lalu jalankan ulang.

## Lint dan format

Gunakan pnpm dari root repository. ESLint memeriksa kode TypeScript; Prettier
menangani format. Konfigurasi ESLint mengikuti
[panduan typescript-eslint](https://typescript-eslint.io/getting-started/), dengan
[eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
untuk menonaktifkan aturan yang berbenturan dengan formatter.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm lint:fix
pnpm format
pnpm check
```

`pnpm check` menjalankan lint tanpa warning dan pemeriksaan format tanpa mengubah
file. Jalankan sebelum commit dan gunakan perintah yang sama sebagai check di CI.
`pnpm format` memperbaiki format; `pnpm lint:fix` memperbaiki masalah lint yang
mendukung autofix. Masalah lint lainnya perlu diperbaiki manual.

### Pengaturan editor

1. Buka folder root `umkmhub` di VS Code atau Cursor.
2. Pasang/aktifkan ekstensi rekomendasi workspace: **ESLint**
   (`dbaeumer.vscode-eslint`) dan **Prettier** (`esbenp.prettier-vscode`).
3. Jalankan **Developer: Reload Window** setelah instalasi dependency/ekstensi.
4. Save file TypeScript untuk menjalankan Prettier dan autofix ESLint. Pengaturan
   workspace sudah mengaktifkan keduanya dan deteksi working directory API.
5. Jika masih bermasalah, lihat panel **Output > ESLint** atau **Output > Prettier**
   untuk error sebenarnya, lalu bandingkan dengan `pnpm check`.

### Agar tidak terulang

- Pakai pnpm secara konsisten, jangan campur `npm install`/Yarn dalam workspace.
  Commit `pnpm-lock.yaml` bersama perubahan dependency; instalasi ulang memakai
  `--frozen-lockfile` supaya versinya sesuai lockfile.
- Simpan aturan format di `apps/api/.prettierrc`, bukan hanya pengaturan pribadi
  editor. `endOfLine: lf`, `.editorconfig`, dan `.gitattributes` menyamakan akhir
  baris antar-OS, termasuk saat Git checkout di Windows.
- Jangan aktifkan formatter lain untuk TypeScript yang menimpa Prettier.
- File hasil generate Prisma, build, dan coverage dikecualikan dari lint/format.
- Di PowerShell yang memblokir `pnpm.ps1`, gunakan `pnpm.cmd` (contoh:
  `pnpm.cmd check`) tanpa mengubah execution policy sistem.

Panduan aplikasi ada di [apps/api/README.md](apps/api/README.md).

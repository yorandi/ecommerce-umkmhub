# UMKMHub

Backend untuk pengelolaan toko UMKM, dibangun dengan NestJS, TypeScript, Prisma,
dan PostgreSQL. Repository menggunakan pnpm workspace; aplikasi API berada di
`apps/api`. Autentikasi menggunakan JWT melalui Passport dan bcrypt untuk hashing
password.

## Status fitur

| Fitur                                    | Status                                           |
| ---------------------------------------- | ------------------------------------------------ |
| Registrasi dan login                     | Tersedia                                         |
| Profil pengguna terautentikasi           | Tersedia                                         |
| Membuat toko dan keanggotaan OWNER       | Tersedia                                         |
| Kategori, produk, inventori, dan pesanan | Model database tersedia; endpoint belum tersedia |

## Persiapan

- Node.js 24, versi yang digunakan saat verifikasi lokal.
- pnpm 12.4.1, sesuai `packageManager` di `package.json`.
- Docker dengan Docker Compose untuk menjalankan PostgreSQL lokal.

Semua perintah berikut dijalankan dari **root repository `umkmhub`**.

### 1. Instal dependency

```bash
pnpm install --frozen-lockfile
```

### 2. Jalankan PostgreSQL

```bash
docker compose up -d postgres
```

Konfigurasi lokal memakai PostgreSQL 16, port `5432`, database `umkmhub`, serta
username dan password `postgres`. Data tersimpan dalam volume `postgres_data`.

### 3. Atur environment

Buat `apps/api/.env` dengan isi berikut. Jika sudah ada, sesuaikan nilainya tanpa
menimpa konfigurasi yang masih digunakan.

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/umkmhub?schema=public"
JWT_SECRET="ganti-dengan-secret-acak"
PORT=3000
```

Buat nilai acak untuk `JWT_SECRET` dengan perintah berikut, lalu salin hasilnya ke
file `.env`. File tersebut tidak disimpan ke Git.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 4. Siapkan Prisma dan tabel database

```bash
pnpm --filter api exec prisma generate --config ./prisma7.config.ts
pnpm --filter api exec prisma migrate deploy --config ./prisma7.config.ts
```

`generate` membuat Prisma client; `migrate deploy` menerapkan migrasi yang sudah
ada di repository. Nama konfigurasi project ini adalah `prisma7.config.ts`,
sehingga perintah Prisma memakai flag `--config` secara eksplisit.

### 5. Jalankan API

```bash
pnpm start:dev
```

Base URL default: `http://localhost:3000/api`. Port mengikuti environment `PORT`.
Server melakukan compile ulang saat source berubah.

## Menggunakan API

| Method | Endpoint             | Autentikasi  | Respons sukses               |
| ------ | -------------------- | ------------ | ---------------------------- |
| POST   | `/api/auth/register` | Tidak        | 201, `{ message, user }`     |
| POST   | `/api/auth/login`    | Tidak        | 200, `{ accessToken, user }` |
| GET    | `/api/auth/me`       | Bearer token | 200, profil pengguna         |
| POST   | `/api/stores`        | Bearer token | 201, toko baru               |

Registrasi, login, lalu gunakan `accessToken` untuk mengakses profil dan membuat
toko. JWT berlaku selama 15 menit; login ulang setelah token kedaluwarsa.

Contoh request, aturan validasi, dan respons error ada di
[dokumentasi API](apps/api/README.md).

## Database

Membuka Prisma Studio:

```bash
pnpm --filter api exec prisma studio --config ./prisma7.config.ts
```

Setelah mengubah `apps/api/prisma/schema.prisma`, buat migrasi pada database
development dan generate ulang client:

```bash
pnpm --filter api exec prisma migrate dev --name nama_perubahan --config ./prisma7.config.ts
pnpm --filter api exec prisma generate --config ./prisma7.config.ts
```

Commit schema dan migrasi bersama kode yang menggunakannya. Prisma client hasil
generate berada di `apps/api/src/generated/prisma`.

## Perintah development

| Perintah dari root             | Kegunaan                                               |
| ------------------------------ | ------------------------------------------------------ |
| `pnpm start:dev`               | Menjalankan API dalam watch mode                       |
| `pnpm --filter api build`      | Compile API ke `apps/api/dist`                         |
| `pnpm --filter api start:prod` | Menjalankan hasil build; lakukan build terlebih dahulu |
| `pnpm --filter api test`       | Menjalankan unit test                                  |
| `pnpm --filter api test:e2e`   | Menjalankan test HTTP                                  |
| `pnpm --filter api test:cov`   | Menjalankan test dengan coverage                       |
| `pnpm check`                   | Memeriksa lint dan format                              |
| `pnpm lint:fix`                | Memperbaiki masalah lint yang mendukung autofix        |
| `pnpm format`                  | Merapikan format source                                |

Test HTTP menggunakan Nest, JWT, validasi, dan guard asli dengan Prisma mock.
Test tersebut tidak memverifikasi koneksi atau migrasi PostgreSQL.

## Struktur project

```text
umkmhub/
  apps/api/
    src/auth/          # Registrasi, login, JWT, dan profil
    src/stores/        # Pembuatan toko dan kepemilikan
    src/prisma/        # Koneksi database melalui Prisma
    src/common/        # Utilitas bersama
    prisma/            # Schema dan migrasi database
    test/              # Test HTTP
    prisma7.config.ts  # Konfigurasi Prisma CLI
  docker-compose.yml   # PostgreSQL lokal
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

## Troubleshooting

- **`Command "prisma" not found`:** Prisma terpasang di workspace API. Gunakan
  perintah dengan `pnpm --filter api exec prisma` dan flag `--config` seperti di atas.
- **`exports is not defined in ES module scope`:** pertahankan `"type": "module"`
  di `apps/api/package.json`, `module: nodenext` di TypeScript, dan ekstensi `.js`
  pada import relatif. Restart server setelah mengubah konfigurasi modul.
- **401 pada endpoint terproteksi:** login ulang dan kirim header
  `Authorization: Bearer <accessToken>`. Token invalid, kedaluwarsa, atau milik
  pengguna yang telah dihapus akan ditolak.
- **Database tidak tersambung:** cek `docker compose ps`, `DATABASE_URL`, dan
  apakah port `5432` sedang digunakan service lain.
- **PowerShell memblokir `pnpm.ps1`:** gunakan `pnpm.cmd`, misalnya
  `pnpm.cmd start:dev`. Di Git Bash gunakan `pnpm` seperti biasa.

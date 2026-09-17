# UMKMHub API

API NestJS untuk autentikasi pengguna dan pembuatan toko. Panduan instalasi,
environment, database, dan menjalankan server ada di
[README utama](../../README.md).

Base URL lokal: `http://localhost:3000/api`, dengan port mengikuti `PORT`.
Gunakan `Content-Type: application/json` untuk request dengan body JSON.

## Registrasi

`POST /api/auth/register`

```json
{
  "name": "Budi",
  "email": "budi@example.com",
  "password": "contohPassword123"
}
```

Respons sukses: **201**, berisi `{ message, user }`. Profil `user` berisi `id`,
`name`, `email`, `role`, dan `createdAt`, tanpa password.

- Nama di-trim dan tidak boleh kosong.
- Email harus valid dan belum terdaftar.
- Password minimal 8 karakter dan maksimal 72 byte UTF-8. Password tidak di-trim.
- Role pengguna baru ditentukan server sebagai `USER`.

## Login

`POST /api/auth/login`

```json
{
  "email": "budi@example.com",
  "password": "contohPassword123"
}
```

Respons sukses: **200**, berisi `{ accessToken, user }`. Gunakan nilai `accessToken`
untuk request berikutnya. Token berlaku selama 15 menit.

Registrasi dan login masing-masing dibatasi 10 request per menit per IP, memakai
penyimpanan rate limit dalam memori proses.

## Profil pengguna

`GET /api/auth/me`

```http
Authorization: Bearer <accessToken>
```

Respons sukses: **200**, berisi `id`, `userId`, `name`, `email`, `role`, dan
`createdAt`. `userId` sama dengan `id`. Password tidak disertakan.

JWT strategy membaca ulang pengguna dari database pada setiap request, sehingga
perubahan role langsung berlaku. Token milik pengguna yang telah dihapus ditolak.

## Membuat toko

`POST /api/stores`

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Toko Budi",
  "description": "Produk kebutuhan sehari-hari"
}
```

Respons sukses: **201**, berisi object toko yang dibuat, termasuk `id`, `name`,
`slug`, `description`, `createdAt`, dan `updatedAt`.

- `name` wajib, panjang 3–10 karakter.
- `description` opsional, maksimal 500 karakter.
- Slug dibuat server dari nama toko dan harus unik.
- Pengguna yang terautentikasi otomatis menjadi anggota toko dengan role `OWNER`.
- Pembuatan toko dan keanggotaan dilakukan dalam satu transaksi database.

Tidak perlu mengirim `userId`, `slug`, atau `role` dalam body request.

## Respons error

| Status | Kondisi                                                                           |
| ------ | --------------------------------------------------------------------------------- |
| 400    | Body gagal validasi atau mengandung field yang tidak diizinkan                    |
| 401    | Kredensial salah, token hilang/invalid/kedaluwarsa, atau pengguna tidak ditemukan |
| 409    | Email sudah terdaftar atau slug toko ditemukan saat pengecekan duplikat           |
| 429    | Batas request registrasi/login terlampaui                                         |
| 500    | Error server yang belum ditangani; lihat log terminal API                         |

## Alur autentikasi di source

1. Login menandatangani JWT dengan `sub` berisi ID pengguna.
2. `JwtAuthGuard` memvalidasi bearer token melalui `JwtStrategy`.
3. Strategy mengambil profil database dan menambahkan `userId: user.id`.
4. Hasilnya bertipe `JwtUser` dan tersedia melalui `@CurrentUser()`.
5. `StoresController` meneruskan `user.userId` ke service untuk membuat anggota
   toko dengan role `OWNER`.

`JwtUser` mengikuti profil aman `AuthUser` dan menambahkan `userId`. Jika bentuk
data autentikasi berubah, selaraskan type, hasil `validate()`, controller, dan
test HTTP.

## Verifikasi

Jalankan dari root repository:

```bash
pnpm --filter api build
pnpm --filter api test:e2e
pnpm check
```

Test HTTP mencakup registrasi, login, profil, pembuatan toko, penolakan token,
validasi input, dan rate limit. Prisma di-mock; untuk memeriksa integrasi database,
jalankan API dengan PostgreSQL lokal dan coba request melalui Postman atau client
HTTP lain.

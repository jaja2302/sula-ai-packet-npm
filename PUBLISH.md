# Cara Rilis Package ke npm (Pertama Kali)

Panduan singkat untuk mempublish **sula-ai** ke npm sehingga orang (atau project lain) bisa `npm install sula-ai`.

---

## 1. Daftar akun npm

- Buka **https://www.npmjs.com**
- Klik **Sign Up**, isi username, email, password
- Verifikasi email kalau diminta

---

## 2. Cek nama package

- Buka **https://www.npmjs.com/package/sula-ai**
- Kalau halaman 404 = nama **sula-ai** masih kosong, bisa dipakai
- Kalau sudah dipakai orang lain, ganti nama di `package.json` (mis. `@username/sula-ai` — lihat langkah 5)

---

## 3. Login npm di komputer

Di terminal (PowerShell / CMD), dari folder mana saja:

```bash
npm login
```

Masukkan:
- **Username**: username npm kamu
- **Password**: password npm
- **Email**: email yang terdaftar
- **OTP**: kalau pakai 2FA, masukkan kode dari app authenticator/email

Selesai kalau muncul: `Logged in as <username> on https://registry.npmjs.org/`

---

## 4. Siapkan package

Dari folder **sula-ai**:

```bash
cd sula-ai
npm run build
```

Pastikan folder **dist/** terisi (isi `index.js` dan `index.d.ts`). Yang di-upload ke npm hanya yang ada di `"files": ["dist", "README.md"]` di `package.json`.

Kalau repo kamu ada di GitHub, di `package.json` bisa isi `repository.url` dengan URL repo (ganti `your-username/warehouse-srs` dengan username dan nama repo kamu) supaya di halaman npm tampil link ke source.

---

## 5. (Opsional) Pakai nama scoped

Kalau **sula-ai** sudah dipakai orang lain, pakai nama scoped (milik akun kamu):

- Di `package.json` ganti:
  ```json
  "name": "@username-kamu/sula-ai"
  ```
- Nanti orang install dengan:
  ```bash
  npm install @username-kamu/sula-ai
  ```

---

## 6. Publish

Masih di folder **sula-ai**:

```bash
npm publish
```

- **Unscoped** (`sula-ai`): package jadi **public** secara default.
- **Scoped** (`@username/sula-ai`): pertama kali mungkin diminta:
  ```bash
  npm publish --access public
  ```

Kalau sukses, terminal akan tampil nama + version yang baru di-publish.

---

## 7. Cek di npm

- Buka **https://www.npmjs.com/package/sula-ai** (atau `@username-kamu/sula-ai`)
- Package kamu akan tampil di sana; orang bisa `npm install sula-ai`.

---

## Update versi (rilis berikutnya)

1. Naikkan **version** di `package.json`, mis. `0.1.0` → `0.1.1` atau `0.2.0`
2. Build lagi: `npm run build`
3. Publish lagi: `npm publish`

Setiap kombinasi **nama + version** hanya bisa dipublish sekali; untuk rilis baru wajib naik version.

---

## Troubleshooting singkat

| Masalah | Solusi |
|--------|--------|
| `403 Forbidden` | Nama package sudah dipakai orang lain → ganti nama atau pakai scoped `@username/sula-ai` |
| `402 Payment Required` | Scoped package default private; pakai `npm publish --access public` |
| `You must verify your email` | Cek inbox (atau spam) dan klik link verifikasi dari npm |
| Lupa sudah login atau belum | Jalankan `npm whoami`; kalau muncul username = sudah login |

Setelah sekali berhasil publish, rilis berikutnya tinggal naik version + `npm run build` + `npm publish`.

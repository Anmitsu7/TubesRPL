<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Klinik</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="../js/script.js" defer></script>
</head>
<body>
    <header>
        <h1>Halaman Admin</h1>
    </header>

    <main>
        <!-- Tambah Jadwal -->
        <section>
            <h2>Pengaturan Jadwal Dokter</h2>
            <button class="toggle-form" data-form-id="formTambahJadwal">Tambah Jadwal</button>
            <form id="formTambahJadwal" style="display: none;">
                <label for="hari">Hari:</label>
                <input type="text" id="hari" name="hari" required>

                <label for="waktu">Waktu:</label>
                <input type="time" id="waktu" name="waktu" required>

                <label for="idDokter">ID Dokter:</label>
                <input type="number" id="idDokter" name="idDokter" required>

                <button type="submit">Simpan</button>
            </form>
        </section>

        <!-- Daftar Transaksi -->
        <section>
            <h2>Daftar Transaksi</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID Transaksi</th>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>123</td>
                        <td>2024-11-25</td>
                        <td>Belum Lunas</td>
                        <td><button class="change-status" data-transaction-id="123">Ubah Status</button></td>
                    </tr>
                </tbody>
            </table>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 Klinik RPL</p>
    </footer>
</body>
</html>

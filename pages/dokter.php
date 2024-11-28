<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dokter Klinik</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="../js/script.js" defer></script>
</head>
<body>
    <header>
        <h1>Halaman Dokter</h1>
    </header>

    <main>
        <!-- Tambah Riwayat Medis -->
        <section>
            <h2>Tambah Riwayat Medis</h2>
            <form id="formTambahRiwayat" onsubmit="return validateForm('formTambahRiwayat');">
                <label for="namaPasien">Nama Pasien:</label>
                <input type="text" id="namaPasien" name="namaPasien" required>

                <label for="diagnosis">Diagnosis:</label>
                <textarea id="diagnosis" name="diagnosis" required></textarea>

                <label for="resep">Resep Obat:</label>
                <textarea id="resep" name="resep" required></textarea>

                <button type="submit">Simpan</button>
            </form>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 Klinik RPL</p>
    </footer>
</body>
</html>

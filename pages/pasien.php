<?php
include '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $idDokter = $_POST['dokter'];
    $tanggal = $_POST['tanggal'];
    $idPasien = 1; // Ambil ID pasien login (dummy untuk contoh).

    $query = "INSERT INTO kunjungandokter (tanggal, idPasien, idDokter) VALUES ('$tanggal', '$idPasien', '$idDokter')";
    if ($conn->query($query) === TRUE) {
        echo "<script>alert('Pendaftaran berhasil!');</script>";
    } else {
        echo "<script>alert('Pendaftaran gagal!');</script>";
    }
}

// Ambil daftar dokter
$doctors = $conn->query("SELECT idUser, namaUser, spesialis FROM user WHERE role = 'Dokter'");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pasien - Pendaftaran</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="../js/script.js" defer></script>
</head>
<body>
    <div class="container">
        <h1>Pendaftaran Pasien</h1>
        <form method="POST" action="">
            <label for="dokter">Pilih Dokter:</label>
            <select id="dokter" name="dokter" required>
                <?php while ($row = $doctors->fetch_assoc()): ?>
                    <option value="<?= $row['idUser'] ?>"><?= $row['namaUser'] ?> (<?= $row['spesialis'] ?>)</option>
                <?php endwhile; ?>
            </select>

            <label for="tanggal">Tanggal Kunjungan:</label>
            <input type="date" id="tanggal" name="tanggal" required>

            <button type="submit">Daftar</button>
        </form>
    </div>
</body>
</html>

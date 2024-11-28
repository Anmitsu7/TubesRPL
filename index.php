<?php
session_start();
include 'includes/db.php'; // File koneksi database

// Proses login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $idUser = $_POST['idUser'];
    $password = $_POST['password'];

    // Ambil data user berdasarkan ID
    $sql = "SELECT * FROM user WHERE idUser = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $idUser);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        // Verifikasi password
        if (password_verify($password, $user['password'])) {
            // Set session
            $_SESSION['idUser'] = $user['idUser'];
            $_SESSION['namaUser'] = $user['namaUser'];
            $_SESSION['role'] = $user['role'];

            // Redirect sesuai role
            if ($user['role'] === 'admin') {
                header("Location: admin/admin_dashboard.php");
            } elseif ($user['role'] === 'dokter') {
                header("Location: dokter/dokter_dashboard.php");
            } elseif ($user['role'] === 'perawat') {
                header("Location: perawat/perawat_dashboard.php");
            } else {
                header("Location: pasien/pasien_dashboard.php");
            }
            exit;
        } else {
            $error = "Password salah!";
        }
    } else {
        $error = "ID User tidak ditemukan!";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Klinik</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="js/script.js" defer></script> <!-- File JS -->
</head>
<body>
    <div class="login-container">
        <h2>Login ke Sistem Klinik</h2>
        
        <?php if (!empty($error)): ?>
            <div class="error-message">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="idUser">ID User</label>
                <input type="text" id="idUser" name="idUser" onblur="fetchUsername(this.value)" required>
            </div>
            <div class="form-group">
                <label for="namaUser">Nama User</label>
                <input type="text" id="namaUser" name="namaUser" readonly>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn">Login</button>
        </form>
    </div>
</body>
</html>

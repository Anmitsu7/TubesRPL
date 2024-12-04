import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import path from 'path';
import bcrypt from 'bcryptjs';
import session from 'express-session';

const app = express();
const PORT = process.env.PORT || 3000;

// Static file path
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
  secret: 'your_secret_key', // Ganti dengan secret yang kuat
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set ke true jika menggunakan https
    maxAge: 3600000 // 1 jam
  }
}));


// Database Connection Pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'klinikrpl2'
});

// EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Root Route
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login Route
// Route untuk menampilkan halaman login
app.get('/login', (req, res) => {
  res.render('login', { message: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.render('login', { message: 'User tidak ditemukan!' });
    }

    const user = results[0];
    const storedPassword = user.password;

    // Check if the stored password is hashed (assuming bcrypt hash starts with $2)
    if (storedPassword.startsWith('$2')) {
      // Password is hashed, use bcrypt.compare
      bcrypt.compare(password, storedPassword, (err, isMatch) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error');
        }

        if (isMatch) {
          // Password matches
          req.session.user = {
            id: user.idUser,
            namaUser: user.namaUser,
            email: user.email,
            role: user.role
          };
          return res.redirect('/dashboard'); // Redirect to dashboard after login
        } else {
          // Password doesn't match
          return res.render('login', { message: 'Password salah!' });
        }
      });
    } else {
      // Password is in plaintext, use direct comparison
      if (password === storedPassword) {
        // Password matches
        req.session.user = {
          id: user.idUser,
          namaUser: user.namaUser,
          email: user.email,
          role: user.role
        };
        return res.redirect('/dashboard'); // Redirect to dashboard after login
      } else {
        // Password doesn't match
        return res.render('login', { message: 'Password salah!' });
      }
    }
  });
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  res.render('dashboard', { user });
});

// Halaman Pasien
app.get('/halaman-pasien', isAuthenticated, (req, res) => {
  if (req.session.user.role === 'pasien') {
    res.render('halaman-pasien', { user: req.session.user });
  } else {
    res.redirect('/dashboard');
  }
});

// Cek Jadwal Dokter Route
app.get('/cek-jadwal-dokter', isAuthenticated, (req, res) => {
  const { dokterId, hari } = req.query;

  pool.query('SELECT * FROM user WHERE role = "dokter"', (err, doctors) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saat mengambil data dokter');
    }

    if (dokterId && hari) {
      const query = `
        SELECT jd.*, u.namaUser
        FROM jadwal_dokter jd
        JOIN user u ON jd.dokterId = u.idUser
        WHERE jd.dokterId = ? AND jd.hari = ?
      `;

      pool.query(query, [dokterId, hari], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error saat mengambil jadwal dokter');
        }

        res.render('cek-jadwal-dokter', {
          jadwal: results,
          doctors,
          dokterId,
          hari
        });
      });
    } else {
      res.render('cek-jadwal-dokter', { doctors, jadwal: [], dokterId: null, hari: null });
    }
  });
});


// Booking Route
app.post('/booking', isAuthenticated, (req, res) => {
  const { jadwalId, metodePendaftaran } = req.body;
  const pasienId = req.session.user.id;

  // Cek ketersediaan slot
  const checkQuery = metodePendaftaran === 'online'
    ? 'SELECT * FROM jadwal_dokter WHERE idJadwal = ? AND sisaKuotaOnline > 0'
    : 'SELECT * FROM jadwal_dokter WHERE idJadwal = ? AND sisaKuotaOffline > 0';

  pool.query(checkQuery, [jadwalId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error saat memproses booking');
    }

    if (results.length === 0) {
      return res.status(400).send('Slot waktu tidak tersedia');
    }

    // Proses booking dan update kuota
    const updateJadwalQuery = metodePendaftaran === 'online' 
      ? 'UPDATE jadwal_dokter SET sisaKuotaOnline = sisaKuotaOnline - 1 WHERE idJadwal = ?' 
      : 'UPDATE jadwal_dokter SET sisaKuotaOffline = sisaKuotaOffline - 1 WHERE idJadwal = ?';

    const insertBookingQuery = `
      INSERT INTO booking (pasienId, jadwalId, tanggalBooking, metodePendaftaran) 
      VALUES (?, ?, NOW(), ?)
    `;

    pool.query(updateJadwalQuery, [jadwalId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saat memperbarui jadwal');
      }

      pool.query(insertBookingQuery, [pasienId, jadwalId, metodePendaftaran], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error saat menyimpan data booking');
        }

        res.redirect('/cek-jadwal-dokter?message=success');
      });
    });
  });
});

// Riwayat Medis Route
app.get('/riwayat-medis', isAuthenticated, (req, res) => {
  const userId = req.session.user.id; // Mengambil ID pasien dari sesi

  // Query untuk mengambil data riwayat medis pasien
  pool.query(
    'SELECT * FROM riwayat_medis WHERE idPasien = ? ORDER BY tanggal DESC',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Error fetching medical history:', err);
        return res.status(500).send('Server error');
      }

      res.render('riwayat-medis', {
        user: req.session.user, // Data pengguna
        riwayatMedis: results,  // Data riwayat medis
      });
    }
  );
});

// Route untuk menambah/edit jadwal dokter
app.post('/tambah-jadwal', isAuthenticated, (req, res) => {
  const { dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline } = req.body;

  // Hanya admin atau dokter yang bersangkutan yang bisa menambah jadwal
  if (req.session.user.role !== 'admin' && req.session.user.id !== dokterId) {
    return res.status(403).send('Tidak memiliki izin');
  }

  const query = `
    INSERT INTO jadwal_dokter 
    (dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline, sisaKuotaOnline, sisaKuotaOffline) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    jamMulai = ?, jamSelesai = ?, 
    kuotaOnline = ?, kuotaOffline = ?, 
    sisaKuotaOnline = ?, sisaKuotaOffline = ?
  `;

  pool.query(
    query, 
    [
      dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline, kuotaOnline, kuotaOffline,
      jamMulai, jamSelesai, kuotaOnline, kuotaOffline, kuotaOnline, kuotaOffline
    ], 
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saat menambah/edit jadwal');
      }
      res.redirect('/dashboard');
    }
  );
});


// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});


// Signup Route
// Route untuk menampilkan halaman signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Route untuk memproses signup
app.post('/signup', (req, res) => {
  const { namaUser, email, password, tanggalLahir, alamat, nomorTelepon } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.render('signup', {
        message: 'Terjadi kesalahan saat mendaftar',
        alertType: 'error'
      });
    }

    const query = 'INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, ?, ?)';

    pool.query(query, [namaUser, email, hashedPassword, tanggalLahir, alamat, nomorTelepon, 'pasien'], (err) => {
      if (err) {
        return res.render('signup', {
          message: 'Email sudah terdaftar atau terjadi kesalahan',
          alertType: 'error'
        });
      }

      // Redirect ke login dengan pesan sukses
      return res.render('login', {
        message: 'Pendaftaran berhasil! Silakan login.',
        alertType: 'success'
      });
    });
  });
});

//Admin route
app.get('/halaman-admin', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  // Fetch tenaga medis (dokter & perawat)
  const mediQuery = 'SELECT * FROM user WHERE role IN ("dokter", "perawat")';
  
  // Fetch jadwal
  const jadwalQuery = `
    SELECT jd.*, u.namaUser 
    FROM jadwal_dokter jd 
    JOIN user u ON jd.dokterId = u.idUser
  `;

  // Fetch transaksi
  const transaksiQuery = `
    SELECT t.*, p.namaUser as namaPasien, d.namaUser as namaDokter 
    FROM transaksi t
    JOIN user p ON t.pasienId = p.idUser
    JOIN user d ON t.dokterId = d.idUser
  `;

  pool.query(mediQuery, (mediErr, tenagaMedis) => {
    if (mediErr) return res.status(500).send('Error fetching tenaga medis');

    pool.query(jadwalQuery, (jadwalErr, jadwal) => {
      if (jadwalErr) return res.status(500).send('Error fetching jadwal');

      pool.query(transaksiQuery, (transaksiErr, transaksi) => {
        if (transaksiErr) return res.status(500).send('Error fetching transaksi');

        res.render('halaman-admin', { 
          user: req.session.user, 
          tenagaMedis, 
          jadwal,
          transaksi
        });
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
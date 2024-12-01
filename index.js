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
        SELECT * 
        FROM jadwal 
        WHERE dokterId = ? AND hari = ? 
      `;

      pool.query(query, [dokterId, hari], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error saat mengambil jadwal dokter');
        }

        res.render('cek-jadwal-dokter', {
          jadwal: results, // Semua slot waktu dari tabel `jadwal`
          doctors,         // Daftar dokter
          dokterId,        // Dokter yang dipilih
          hari             // Hari yang dipilih
        });
      });
    } else {
      res.render('cek-jadwal-dokter', { doctors, jadwal: [], dokterId: null, hari: null });
    }
  });
});


// Booking Route
app.post('/booking', isAuthenticated, (req, res) => {
  const { jadwalId } = req.body;
  const pasienId = req.session.user.id;

  // Periksa apakah slot waktu masih tersedia
  pool.query('SELECT * FROM jadwal WHERE idJadwal = ? AND status = "Tersedia"', [jadwalId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error saat memproses booking');
    }

    if (results.length === 0) {
      return res.status(400).send('Slot waktu sudah tidak tersedia');
    }

    // Update status slot waktu dan tambahkan ke tabel booking
    const updateJadwalQuery = 'UPDATE jadwal SET status = "Booked" WHERE idJadwal = ?';
    const insertBookingQuery = 'INSERT INTO booking (pasienId, jadwalId, tanggalBooking) VALUES (?, ?, NOW())';

    pool.query(updateJadwalQuery, [jadwalId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saat memperbarui jadwal');
      }

      pool.query(insertBookingQuery, [pasienId, jadwalId], (err) => {
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


// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

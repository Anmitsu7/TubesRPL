import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import mysql from 'mysql';
import path from 'path';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import flash from 'express-flash';

const app = express();
const PORT = process.env.PORT || 3000;

// Static file path
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


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

//flash message middleware
app.use(flash());


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

    // Fungsi validasi password
    const validatePassword = (inputPassword) => {
      // Jika password di-hash
      if (storedPassword.startsWith('$2')) {
        return new Promise((resolve, reject) => {
          bcrypt.compare(inputPassword, storedPassword, (err, isMatch) => {
            if (err) reject(err);
            resolve(isMatch);
          });
        });
      }

      // Jika password plain text
      return Promise.resolve(inputPassword === storedPassword);
    };

    validatePassword(password)
      .then(isMatch => {
        if (isMatch) {
          // Simpan sesi dengan benar
          req.session.user = {
            idUser: user.idUser,
            namaUser: user.namaUser,
            email: user.email,
            role: user.role
          };

          // Redirect ke halaman konfirmasi dashboard
          res.redirect('/dashboard');
        } else {
          return res.render('login', { message: 'Password salah!' });
        }
      })
      .catch(err => {
        console.error(err);
        return res.status(500).send('Server error');
      });
  });
});

// Middleware untuk memeriksa apakah pengguna sudah login sebelum mengakses dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Jika tidak ada session user, redirect ke login
  }

  // Jika session ada, tampilkan dashboard
  res.render('dashboard', { user: req.session.user });
});
// Signup Route
// Route untuk menampilkan halaman signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Route untuk memproses signup
app.post('/signup', (req, res) => {
  const { namaUser, email, password, confirmPassword, tanggalLahir, alamat, nomorTelepon } = req.body;

  // Validasi server-side
  if (password.length < 6) {
    return res.render('signup', {
      message: 'Password minimal 6 karakter',
      alertType: 'error',
      // Kembalikan data form sebelumnya agar tidak perlu diisi ulang
      formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
    });
  }

  // Cek konfirmasi password
  if (password !== confirmPassword) {
    return res.render('signup', {
      message: 'Konfirmasi password tidak cocok',
      alertType: 'error',
      formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
    });
  }

  // Lanjutkan proses hash password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.render('signup', {
        message: 'Terjadi kesalahan saat mendaftar',
        alertType: 'error',
        formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
      });
    }

    const query = 'INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, ?, ?)';

    pool.query(query, [namaUser, email, hashedPassword, tanggalLahir, alamat, nomorTelepon, 'pasien'], (err) => {
      if (err) {
        return res.render('signup', {
          message: 'Email sudah terdaftar atau terjadi kesalahan',
          alertType: 'error',
          formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
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

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

//-------------------------------------------------------------------------------------------------
//rute pasien
app.get('/halaman-pasien', isAuthenticated, (req, res) => {
  if (req.session.user.role === 'pasien') {
    res.render('pasien/halaman-pasien', { user: req.session.user });
  } else {
    res.redirect('/dashboard');
  }
});

//cek jadwal dokter
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


//booking
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

//cek riwayat medis
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

//-------------------------------------------------------------------------------------------------
//rute admin
// Admin Dashboard
app.get('/halaman-admin', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.render('admin/dashboard', { user: req.session.user });
});

// Manage Antrian (Queue Management)
app.get('/admin/kelola-antrian', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const metodePendaftaran = req.query.metode || 'online'; // Default ke online

  const query = `
    SELECT b.*, u.namaUser, u.nomorTelepon, jd.hari, jd.jamMulai, jd.jamSelesai, d.namaUser as namaDokter,
    jd.${metodePendaftaran === 'online' ? 'sisaKuotaOnline' : 'sisaKuotaOffline'} as sisaKuota
    FROM booking b
    JOIN user u ON b.pasienId = u.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterId = d.idUser
    WHERE b.status = 'aktif' AND b.nomorAntrian IS NULL AND b.metodePendaftaran = ?
    ORDER BY b.tanggalBooking
  `;

  pool.query(query, [metodePendaftaran], (err, bookings) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    // Dapatkan jadwal dokter untuk filter
    pool.query('SELECT * FROM jadwal_dokter', (errJadwal, jadwalDokter) => {
      if (errJadwal) {
        console.error(errJadwal);
        return res.status(500).send('Server error');
      }

      res.render('admin/kelola-antrian', {
        user: req.session.user,
        bookings,
        metodePendaftaran,
        jadwalDokter
      });
    });
  });
});

//assign nomor antrian
app.post('/admin/assign-antrian', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { bookingId, nomorAntrian, metodePendaftaran } = req.body;

  // Mulai transaksi untuk memastikan konsistensi data
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database connection error');
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        console.error(err);
        return res.status(500).send('Transaction error');
      }

      // Update nomor antrian pada booking
      const updateBookingQuery = 'UPDATE booking SET nomorAntrian = ? WHERE idBooking = ?';
      connection.query(updateBookingQuery, [nomorAntrian, bookingId], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            console.error(err);
            res.status(500).send('Error updating booking');
          });
        }

        // Kurangi sisa kuota pada jadwal dokter
        const updateKuotaQuery = `
          UPDATE jadwal_dokter 
          SET ${metodePendaftaran === 'online' ? 'sisaKuotaOnline' : 'sisaKuotaOffline'} = 
          ${metodePendaftaran === 'online' ? 'sisaKuotaOnline' : 'sisaKuotaOffline'} - 1 
          WHERE idJadwal = (SELECT jadwalId FROM booking WHERE idBooking = ?)
        `;

        connection.query(updateKuotaQuery, [bookingId], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error(err);
              res.status(500).send('Error updating quota');
            });
          }

          // Commit transaksi
          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error(err);
                res.status(500).send('Commit error');
              });
            }

            connection.release();
            res.redirect(`/admin/kelola-antrian?metode=${metodePendaftaran}`);
          });
        });
      });
    });
  });
});

//registrasi pasien offline
app.get('/admin/daftar-pasien-offline', isAuthenticated, async (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  try {
    // Dapatkan hari ini dalam bahasa Indonesia
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = days[new Date().getDay()];

    // Query untuk mendapatkan hanya dokter yang memiliki jadwal hari ini
    const query = `
        SELECT DISTINCT u.idUser, u.namaUser, 
               GROUP_CONCAT(
                 CONCAT(
                   TIME_FORMAT(j.jamMulai, '%H:%i'), 
                   ' - ', 
                   TIME_FORMAT(j.jamSelesai, '%H:%i')
                 )
               ) as jadwalHariIni
        FROM user u
        INNER JOIN jadwal_dokter j ON u.idUser = j.dokterId
        WHERE u.role = 'dokter' 
        AND j.hari = ?
        AND j.sisaKuotaOffline > 0
        GROUP BY u.idUser, u.namaUser
    `;

    const [doctors] = await pool.query(query, [today]);

    res.render('admin/daftar-pasien-offline', {
      user: req.session.user,
      doctors: doctors,
      today: today,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error:', error);
    req.flash('error', 'Terjadi kesalahan saat memuat data');
    res.redirect('/admin/dashboard');
  }
});

app.post('/admin/daftar-pasien-offline', isAuthenticated, async (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { namaUser, email, tanggalLahir, alamat, nomorTelepon, jadwalId } = req.body;

    // 1. Insert data pasien baru
    const insertUserQuery = `
      INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) 
      VALUES (?, ?, ?, ?, ?, ?, 'pasien')
    `;
    const hashedPassword = await bcrypt.hash(nomorTelepon, 10);

    const [userResult] = await connection.query(insertUserQuery, [
      namaUser,
      email,
      hashedPassword,
      tanggalLahir,
      alamat,
      nomorTelepon
    ]);

    const pasienId = userResult.insertId;

    // 2. Insert booking tanpa nomor antrian
    const insertBookingQuery = `
      INSERT INTO booking (pasienId, jadwalId, tanggalBooking, metodePendaftaran, status, nomorAntrian, statusAntrian)
      VALUES (?, ?, NOW(), 'offline', 'aktif', NULL, 'menunggu')
    `;

    await connection.query(insertBookingQuery, [pasienId, jadwalId]);

    // 3. Update sisa kuota offline
    const updateKuotaQuery = `
      UPDATE jadwal_dokter 
      SET sisaKuotaOffline = sisaKuotaOffline - 1 
      WHERE idJadwal = ? AND sisaKuotaOffline > 0
    `;

    await connection.query(updateKuotaQuery, [jadwalId]);

    await connection.commit();

    req.flash('success', 'Pasien berhasil didaftarkan! Silahkan atur nomor antrian di halaman Manage Queue');
    res.redirect('/admin/kelola-antrian?metode=offline');

  } catch (error) {
    await connection.rollback();
    console.error('Error in patient registration:', error);
    req.flash('error', 'Terjadi kesalahan saat mendaftarkan pasien');
    res.redirect('/admin/daftar-pasien-offline');
  } finally {
    connection.release();
  }
});

// Endpoint untuk mendapatkan jadwal dokter specific di hari ini
app.get('/admin/jadwal-dokter/:id', (req, res) => {
  const dokterId = req.params.id;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[new Date().getDay()];

  const query = `
    SELECT idJadwal, jamMulai, jamSelesai, sisaKuotaOffline
    FROM jadwal_dokter 
    WHERE dokterId = ? 
    AND hari = ?
    AND sisaKuotaOffline > 0
  `;

  pool.query(query, [dokterId, today], (err, schedules) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(schedules);
  });
});

//atur jadwal dokter
app.get('/admin/kelola-jadwal-dokter', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  // Fetch doctors and their schedules
  const query = `
    SELECT jd.*, u.namaUser 
    FROM jadwal_dokter jd
    JOIN user u ON jd.dokterId = u.idUser
    ORDER BY u.namaUser, jd.hari
  `;

  pool.query(query, (err, schedules) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    // Fetch doctors for dropdown
    pool.query('SELECT * FROM user WHERE role = "dokter"', (err, doctors) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.render('admin/kelola-jadwal-dokter', {
        user: req.session.user,
        schedules,
        doctors
      });
    });
  });
});

app.post('/admin/tambah-jadwal', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline } = req.body;

  const query = `
    INSERT INTO jadwal_dokter 
    (dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline, sisaKuotaOnline, sisaKuotaOffline) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  pool.query(query, [
    dokterId,
    hari,
    jamMulai,
    jamSelesai,
    kuotaOnline,
    kuotaOffline,
    kuotaOnline,
    kuotaOffline
  ], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error adding doctor schedule');
    }
    res.redirect('/admin/kelola-jadwal-dokter');
  });
});

app.post('/admin/update-jadwal', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { idJadwal, jamMulai, jamSelesai, kuotaOnline, kuotaOffline } = req.body;

  const query = `
    UPDATE jadwal_dokter 
    SET jamMulai = ?, jamSelesai = ?, 
        kuotaOnline = ?, sisaKuotaOnline = ?,
        kuotaOffline = ?, sisaKuotaOffline = ?
    WHERE idJadwal = ?
  `;

  pool.query(query, [
    jamMulai,
    jamSelesai,
    kuotaOnline,
    kuotaOnline,
    kuotaOffline,
    kuotaOffline,
    idJadwal
  ], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error updating doctor schedule');
    }
    res.redirect('/admin/kelola-jadwal-dokter');
  });
});

//manage transaksi
app.get('/admin/transaksi', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT t.*, p.namaUser as namaPasien, d.namaUser as namaDokter
    FROM transaksi t
    JOIN user p ON t.pasienId = p.idUser
    JOIN user d ON t.dokterId = d.idUser
    WHERE t.status = 'Pending'
    ORDER BY t.tanggal
  `;

  pool.query(query, (err, transaksi) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('admin/transaksi', { user: req.session.user, transaksi });
  });
});

app.post('/admin/proses-transaksi', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const {
    idTransaksi,
    metodePembayaran,
    biayaKonsultasi,
    biayaTindakan,
    status
  } = req.body;

  const query = `
    UPDATE transaksi 
    SET 
      metodePembayaran = ?, 
      biayaKonsultasi = ?, 
      biayaTindakan = ?, 
      totalBiaya = ? + ?,
      status = ?,
      tanggalPembayaran = NOW()
    WHERE id = ?
  `;

  const totalBiaya = parseFloat(biayaKonsultasi) + parseFloat(biayaTindakan);

  pool.query(query, [
    metodePembayaran,
    biayaKonsultasi,
    biayaTindakan,
    biayaKonsultasi,
    biayaTindakan,
    status,
    idTransaksi
  ], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error processing transaction');
    }
    res.redirect('/admin/transaksi');
  });
});

//-------------------------------------------------------------------------------------------------
//rute dokter
app.get('/halaman-dokter', async (req, res) => {
  try {
    // Cek session
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const dokterId = req.session.user.idUser;

    // Query untuk data dokter dengan pengecekan role yang lebih detail
    const queryDokter = `
      SELECT 
        idUser,
        namaUser as namaDokter,
        email,
        tanggalLahir,
        alamat,
        nomorTelepon,
        role 
      FROM user 
      WHERE idUser = ? AND role = 'dokter'
    `;

    // Query untuk daftar pasien hari ini
    const queryPasien = `
      SELECT 
        u.namaUser as pasien,
        u.nomorTelepon,
        b.tanggalBooking,
        b.metodePendaftaran,
        b.status,
        b.nomorAntrian,
        b.statusAntrian 
      FROM booking b
      JOIN user u ON b.pasienId = u.idUser
      JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
      WHERE jd.dokterId = ?
      AND DATE(b.tanggalBooking) = CURDATE() 
      AND b.status = 'aktif'
      ORDER BY b.nomorAntrian ASC
    `;

    // Query untuk jadwal dokter
    const queryJadwal = `
      SELECT 
        idJadwal,
        hari,
        jamMulai,
        jamSelesai 
      FROM jadwal_dokter 
      WHERE dokterId = ?
      ORDER BY 
        CASE
          WHEN hari = 'Senin' THEN 1
          WHEN hari = 'Selasa' THEN 2
          WHEN hari = 'Rabu' THEN 3
          WHEN hari = 'Kamis' THEN 4
          WHEN hari = 'Jumat' THEN 5
          WHEN hari = 'Sabtu' THEN 6
          WHEN hari = 'Minggu' THEN 7
        END ASC
    `;

    // Membuat fungsi query dengan Promise
    const queryAsync = (query, params) => {
      return new Promise((resolve, reject) => {
        pool.query(query, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Eksekusi query dokter
    const dokterResult = await queryAsync(queryDokter, [dokterId]);

    // Validasi dokter
    if (dokterResult.length === 0) {
      return res.status(403).send('Akses ditolak: Anda tidak memiliki akses sebagai dokter');
    }

    // Eksekusi query pasien dan jadwal
    const [pasienResult, jadwalResult] = await Promise.all([
      queryAsync(queryPasien, [dokterId]),
      queryAsync(queryJadwal, [dokterId])
    ]);

    // Format tanggal lahir
    if (dokterResult[0].tanggalLahir) {
      dokterResult[0].tanggalLahir = new Date(dokterResult[0].tanggalLahir)
        .toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
    }

    // Format tanggal booking
    const formattedPasienResult = pasienResult.map(pasien => ({
      ...pasien,
      tanggalBooking: pasien.tanggalBooking
        ? new Date(pasien.tanggalBooking)
          .toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null
    }));

    // Render halaman dengan semua data
    res.render('dokter/halaman-dokter', {
      user: req.session.user,
      daftarPasien: formattedPasienResult,
      jadwal: jadwalResult,
      dokter: dokterResult[0]
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Terjadi kesalahan yang tidak terduga');
  }
});

app.get('/diagnosa', (req, res) => {
  // Cek apakah user sudah login
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Jika user adalah dokter, lanjutkan
  if (req.session.user.role !== 'dokter') {
    return res.status(403).send('Akses ditolak');
  }

  // Query untuk mengambil data hasil diagnosa
  const query = `
    SELECT 
      rm.idRiwayatMedis,
      u.namaUser as namaPasien,
      rm.tanggal,
      rm.diagnosa,
      rm.resep,
      rm.catatan
    FROM riwayat_medis rm
    JOIN user u ON rm.idPasien = u.idUser
    ORDER BY rm.tanggal DESC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching diagnosa:', err);
      return res.status(500).send('Terjadi kesalahan saat mengambil data');
    }

    // Format tanggal untuk setiap hasil
    const formattedResults = results.map(result => ({
      ...result,
      tanggal: new Date(result.tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Render halaman dengan data
    res.render('dokter/diagnosa', {
      user: req.session.user,
      hasilDiagnosa: formattedResults
    });
  });
});
app.post('catat-obat', (req, res) => {
  // Cek session
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Cek role
  if (req.session.user.role !== 'dokter') {
    return res.status(403).send('Akses ditolak: Hanya dokter yang dapat mencatat obat');
  }

  // Dapatkan pasienId dari tombol submit
  const pasienId = req.body.submit;
  const obat = req.body[`obat_${pasienId}`];

  // Validasi input
  if (!pasienId || !obat) {
    return res.status(400).send('Data tidak lengkap');
  }

  // Query untuk mencatat obat ke riwayat medis
  const queryCatatObat = `
    INSERT INTO riwayat_medis 
    (idPasien, tanggal, resep, catatan) 
    VALUES 
    (?, NOW(), ?, 'Obat diberikan oleh dokter')
  `;

  pool.query(queryCatatObat, [pasienId, obat], (err, result) => {
    if (err) {
      console.error('Error mencatat obat:', err);
      return res.status(500).send('Terjadi kesalahan saat mencatat obat');
    }

    // Update status booking jika diperlukan
    const queryUpdateBooking = `
      UPDATE booking 
      SET status = 'selesai' 
      WHERE pasienId = ? AND DATE(tanggalBooking) = CURDATE()
    `;

    pool.query(queryUpdateBooking, [pasienId], (updateErr) => {
      if (updateErr) {
        console.error('Error update status booking:', updateErr);
      }

      // Redirect dengan pesan sukses
      req.flash('success', 'Obat berhasil dicatat');
      res.redirect('/dokter/catat-obat');
    });
  });
});

// Rute untuk halaman catat obat khusus dokter
app.get('/catat-obat', (req, res) => {
  // Cek session
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Cek role (pastikan hanya dokter yang bisa akses)
  if (req.session.user.role !== 'dokter') {
    return res.status(403).send('Akses ditolak: Hanya dokter yang dapat mengakses halaman ini');
  }

  // Query untuk mendapatkan daftar pasien hari ini
  const queryPasien = `
    SELECT 
      u.idUser as pasienId,
      u.namaUser as pasien,
      b.idBooking,
      b.tanggalBooking
    FROM booking b
    JOIN user u ON b.pasienId = u.idUser
    WHERE DATE(b.tanggalBooking) = CURDATE() 
    AND b.status = 'aktif'
    ORDER BY b.tanggalBooking
  `;

  pool.query(queryPasien, (err, daftarPasien) => {
    if (err) {
      console.error('Error mengambil daftar pasien:', err);
      return res.status(500).send('Terjadi kesalahan saat mengambil daftar pasien');
    }

    // Format tanggal untuk setiap pasien
    const formattedPasien = daftarPasien.map(pasien => ({
      ...pasien,
      tanggalBooking: new Date(pasien.tanggalBooking)
        .toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
    }));

    // Render halaman catat obat
    res.render('dokter/catat-obat', {
      user: req.session.user,
      daftarPasien: formattedPasien
    });
  });
});

app.get('/lihat-jadwal-pasien', (req, res) => {
  try {
    const dokterId = req.query.dokterId;

    // Debug: cek apakah dokterId ada dalam query string
    console.log('dokterId:', dokterId);

    // Validasi input dokterId
    if (!dokterId) {
      return res.render('dokter/lihat-jadwal-pasien', {
        user: req.session.user || {},
        jadwalPasien: [],
        totalPasien: 0,
        pesan: 'Dokter ID tidak boleh kosong, silakan pilih dokter terlebih dahulu.'
      });
    }

    // Query untuk mendapatkan jadwal pasien dengan informasi lengkap
    const query = `
      SELECT 
        u.namaUser AS pasien, 
        u.nomorTelepon AS teleponPasien,
        b.tanggalBooking, 
        b.metodePendaftaran, 
        b.nomorAntrian, 
        b.statusAntrian,
        jd.hari,
        jd.jamMulai,
        jd.jamSelesai,
        dok.namaUser AS namaDokter
      FROM booking b
      JOIN user u ON b.pasienId = u.idUser
      JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
      JOIN user dok ON jd.dokterId = dok.idUser
      WHERE jd.dokterId = ? 
        AND DATE(b.tanggalBooking) = CURDATE()
      ORDER BY b.tanggalBooking;
    `;

    pool.query(query, [dokterId], (err, hasil) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).render('error', {
          message: 'Kesalahan server: Gagal mengambil jadwal pasien',
          user: req.session.user || {}
        });
      }

      // Proses data untuk tampilan
      const jadwalPasien = hasil.map(item => ({
        namaPasien: item.pasien,
        teleponPasien: item.teleponPasien,
        tanggalBooking: moment(item.tanggalBooking).format('DD MMMM YYYY HH:mm'),
        metodePendaftaran: item.metodePendaftaran,
        nomorAntrian: item.nomorAntrian || 'Belum ditentukan',
        statusAntrian: item.statusAntrian,
        hari: item.hari,
        jamMulai: item.jamMulai,
        jamSelesai: item.jamSelesai,
        namaDokter: item.namaDokter
      }));

      // Render halaman dengan data
      res.render('dokter/lihat-jadwal-pasien', {
        user: req.session.user || {},
        jadwalPasien: jadwalPasien,
        totalPasien: jadwalPasien.length,
        pesan: jadwalPasien.length === 0 ? 'Tidak ada jadwal pasien hari ini.' : null
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).render('error', {
      message: 'Terjadi kesalahan tidak terduga',
      user: req.session.user || {}
    });
  }
});

app.get('/halaman-perawat', (req, res) => {
  // Pastikan hanya perawat yang bisa mengakses
  if (req.session.role !== 'perawat') {
      return res.redirect('/login');
  }

  // Query untuk mendapatkan daftar antrian pasien yang menunggu
  const queryBookings = `
      SELECT 
          b.idBooking, 
          u.idUser as pasienId, 
          u.namaUser as namaPasien, 
          b.statusAntrian,
          jd.hari,
          jd.jamMulai,
          jd.jamSelesai,
          d.namaUser as namaDokter
      FROM 
          booking b
      JOIN 
          user u ON b.pasienId = u.idUser
      JOIN
          jadwal_dokter jd ON b.jadwalId = jd.idJadwal
      JOIN 
          user d ON jd.dokerId = d.idUser
      WHERE 
          b.statusAntrian IN ('menunggu', 'dipanggil')
      ORDER BY 
          b.statusAntrian = 'menunggu' DESC, 
          b.idBooking
  `;

  // Query untuk mendapatkan total antrian hari ini
  const queryTotalAntrian = `
      SELECT 
          COUNT(*) as totalAntrian,
          SUM(CASE WHEN statusAntrian = 'menunggu' THEN 1 ELSE 0 END) as antrianMenunggu,
          SUM(CASE WHEN statusAntrian = 'dipanggil' THEN 1 ELSE 0 END) as antrianDipanggil
      FROM 
          booking
      WHERE 
          DATE(tanggalBooking) = CURDATE()
  `;

  // Jalankan query secara paralel
  Promise.all([
      new Promise((resolve, reject) => {
          pool.query(queryBookings, (error, bookings) => {
              if (error) reject(error);
              resolve(bookings);
          });
      }),
      new Promise((resolve, reject) => {
          pool.query(queryTotalAntrian, (error, totalAntrian) => {
              if (error) reject(error);
              resolve(totalAntrian[0]);
          });
      })
  ])
  .then(([bookings, totalAntrian]) => {
      res.render('halaman-perawat', { 
          bookings: bookings,
          totalAntrian: totalAntrian,
          user: req.session,
          title: 'Halaman Perawat - Antrian Pasien'
      });
  })
  .catch(error => {
      console.error('Error fetching data:', error);
      res.status(500).render('error', { 
          message: 'Terjadi kesalahan server',
          error: error
      });
  });
});

app.post('/halaman-perawat', (req, res) => {
  // Pastikan hanya perawat yang bisa mengakses
  if (req.session.role !== 'perawat') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { bookingId, currentStatus } = req.body;
  let newStatus;

  // Logika perubahan status
  switch(currentStatus) {
      case 'menunggu':
          newStatus = 'dipanggil';
          break;
      case 'dipanggil':
          newStatus = 'selesai';
          break;
      default:
          return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const query = 'UPDATE booking SET statusAntrian = ? WHERE idBooking = ?';
  
  pool.query(query, [newStatus, bookingId], (error, result) => {
      if (error) {
          console.error('Error updating booking status:', error);
          return res.status(500).json({ success: false, message: 'Server error' });
      }

      // Log perubahan status
      const logQuery = `
          INSERT INTO log_status_booking 
          (bookingId, statusLama, statusBaru, petugasId, waktuPerubahan) 
          VALUES (?, ?, ?, ?, NOW())
      `;
      pool.query(logQuery, [bookingId, currentStatus, newStatus, req.session.idUser]);

      // Jika request adalah AJAX, kirim JSON
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({ 
              success: true, 
              message: 'Status berhasil diupdate', 
              newStatus: newStatus 
          });
      }

      // Jika bukan AJAX, redirect kembali ke halaman
      req.flash('success', 'Status booking berhasil diperbarui');
      res.redirect('/halaman-perawat');
  });
});
//-------------------------------------------------------------------------------------------------

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

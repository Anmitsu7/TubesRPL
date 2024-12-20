import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import express from 'express';
import flash from 'express-flash';
import mysqlSession from 'express-mysql-session';
import session from 'express-session';
import mysql from 'mysql';
import path from 'path';

const MySQLStore = mysqlSession(session);
const app = express();
const PORT = process.env.PORT || 3000;

// Database Configuration
const dbConfig = {
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'klinikrpl2'
};

// Create MySQL session store
const sessionStore = new MySQLStore({
  ...dbConfig,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true
});

// Session Configuration yang lebih baik
app.use(session({
  key: 'klinik_session',
  secret: crypto.randomBytes(32).toString('hex'), // Secret key yang lebih aman
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true jika menggunakan HTTPS
    httpOnly: true,
    maxAge: 86400000, // 24 jam
    sameSite: 'strict'
  }
}));

// Static file path
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());

// Database Connection Pool
const pool = mysql.createPool(dbConfig);

// Middleware untuk cek authentication dengan pesan yang lebih informatif
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    req.flash('error', 'Silakan login terlebih dahulu');
    res.redirect('/login');
  }
};

//-------------------------------------------------------------------------------------------------

// Root Route
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login Route
app.get('/login', (req, res) => {
  res.render('login', {
    message: req.flash('error'),
    success: req.flash('success')
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'Terjadi kesalahan server');
      return res.redirect('/login');
    }

    if (results.length === 0) {
      req.flash('error', 'Email tidak terdaftar');
      return res.redirect('/login');
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
          // Simpan data user ke session
          req.session.user = {
            idUser: user.idUser,
            namaUser: user.namaUser,
            email: user.email,
            role: user.role
          };

          // Simpan session ke database
          req.session.save(err => {
            if (err) {
              console.error('Session save error:', err);
              req.flash('error', 'Terjadi kesalahan saat login');
              return res.redirect('/login');
            }

            // Redirect berdasarkan role
            switch (user.role) {
              case 'admin':
                res.redirect('/halaman-admin');
                break;
              case 'dokter':
                res.redirect('/halaman-dokter'); // Hapus prefix /dokter/
                break;
              case 'perawat':
                res.redirect('/perawat/halaman-perawat');
                break;
              case 'pasien':
                res.redirect('/dashboard');
                break;
              default:
                res.redirect('/dashboard');
            }
          });
        } else {
          req.flash('error', 'Password salah');
          res.redirect('/login');
        }
      })
      .catch(err => {
        console.error('Login error:', err);
        req.flash('error', 'Terjadi kesalahan saat login');
        res.redirect('/login');
      });
  });
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, (req, res) => {
  const { role } = req.session.user;

  switch (role) {
    case 'admin':
      res.redirect('/halaman-admin');
      break;
    case 'dokter':
      res.redirect('/halaman-dokter');
      break;
    case 'pasien':
      res.redirect('/halaman-pasien');
      break;
    default:
      req.flash('error', 'Role tidak valid');
      res.redirect('/login');
  }
});

// Signup Route
app.get('/signup', (req, res) => {
  res.render('signup', {
    message: null,
    formData: {},
    alertType: null
  });
});

app.post('/signup', (req, res) => {
  const { namaUser, email, password, confirmPassword, tanggalLahir, alamat, nomorTelepon } = req.body;

  // Validasi server-side
  if (password.length < 6) {
    return res.render('signup', {
      message: 'Password minimal 6 karakter',
      alertType: 'error',
      formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
    });
  }

  if (password !== confirmPassword) {
    return res.render('signup', {
      message: 'Konfirmasi password tidak cocok',
      alertType: 'error',
      formData: { namaUser, email, tanggalLahir, alamat, nomorTelepon }
    });
  }

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

      req.flash('success', 'Pendaftaran berhasil! Silakan login.');
      res.redirect('/login');
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

///rute pasien
app.get('/halaman-pasien', isAuthenticated, (req, res) => {
  console.log('Halaman Pasien Route - Session User:', req.session.user);

  if (req.session.user && req.session.user.role === 'pasien') {
    res.render('pasien/halaman-pasien', { user: req.session.user });
  } else {
    console.log('User role is not pasien, redirecting to dashboard');
    res.redirect('/dashboard');
  }
});

//cek jadwal dokter
app.get('/pasien/cek-jadwal-dokter', isAuthenticated, (req, res) => {
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

        res.render('pasien/cek-jadwal-dokter', {
          jadwal: results,
          doctors,
          dokterId,
          hari
        });
      });
    } else {
      res.render('pasien/cek-jadwal-dokter', { doctors, jadwal: [], dokterId: null, hari: null });
    }
  });
});


//booking
app.post('/booking', isAuthenticated, (req, res) => {
  const { jadwalId, metodePendaftaran } = req.body;
  const pasienId = req.session.user.idUser;

  console.log('User ID:', req.session.user ? req.session.user.idUser : 'No user ID');

  if (!req.session.user.idUser) {
    console.error('ID User tidak ditemukan di session');
    return res.status(401).send('ID Pengguna tidak ditemukan');
  }


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

        // Redirect with booking success message and booking number
        res.redirect(`/pasien/cek-jadwal-dokter?message=success`);


      });
    });

  });
});

//cek riwayat medis
app.get('/pasien/riwayat-medis', isAuthenticated, (req, res) => {
  // Gunakan req.session.user.idUser karena log menunjukkan ini adalah ID yang benar
  const userId = req.session.user.idUser;

  pool.query(
    'SELECT * FROM riwayat_medis WHERE idPasien = ? ORDER BY tanggal DESC',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Error fetching medical history:', err);
        return res.status(500).send('Server error');
      }

      // Log jumlah hasil dan detail hasil
      console.log('Number of medical history records:', results.length);
      console.log('Medical history results:', results);

      res.render('pasien/riwayat-medis', {
        user: req.session.user,
        riwayatMedis: results,
      });
    }
  );
});

app.get('/pasien/riwayat-pembayaran', isAuthenticated, (req, res) => {
  const userId = req.session.user.idUser;

  // Log the user ID for debugging
  console.log('Attempting to fetch transactions for user ID:', userId);

  const query = `
    SELECT 
      t.id,
      t.tanggal,
      d.namaUser as namaDokter,
      t.totalBiaya,
      t.status
    FROM transaksi t
    LEFT JOIN user d ON t.dokterId = d.idUser
    WHERE t.pasienId = ?
    ORDER BY t.tanggal DESC
  `;

  // First, verify the connection
  if (!pool) {
    console.error('Database connection pool is not initialized');
    return res.render('error', {
      message: 'Terjadi kesalahan koneksi database',
      error: { status: 500, stack: '' }
    });
  }

  pool.query(query, [userId], (err, results) => {
    if (err) {
      // Log the detailed error
      console.error('Database error:', err);
      return res.render('error', {
        message: 'Terjadi kesalahan saat mengambil data riwayat pembayaran',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? err.stack : '' }
      });
    }

    // Log the results for debugging
    console.log('Query results:', results);

    // Check if results exist
    if (!results) {
      console.log('No results returned from query');
      return res.render('pasien/riwayat-pembayaran', {
        user: req.session.user,
        transactions: []
      });
    }

    res.render('pasien/riwayat-pembayaran', {
      user: req.session.user,
      transactions: results
    });
  });
});

//-------------------------------------------------------------------------------------------------
// Admin Routes
app.get('/halaman-admin', isAuthenticated, (req, res) => {
  console.log('Halaman Pasien Route - Session User:', req.session.user);

  if (req.session.user && req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }
  res.render('admin/dashboard', {
    user: req.session.user,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// Registrasi Pasien Offline Routes
app.get('/admin/daftar-pasien-offline', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

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

  pool.query(query, [today], (err, doctors) => {
    if (err) {
      console.error('Error:', err);
      req.flash('error', 'Terjadi kesalahan saat memuat data');
      return res.redirect('/admin/dashboard');
    }

    res.render('admin/daftar-pasien-offline', {
      user: req.session.user,
      doctors: doctors,
      today: today,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

app.post('/admin/daftar-pasien-offline', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  pool.getConnection((err, connection) => {
    if (err) {
      req.flash('error', 'Terjadi kesalahan koneksi database');
      return res.redirect('/admin/daftar-pasien-offline');
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        req.flash('error', 'Terjadi kesalahan saat memulai transaksi');
        return res.redirect('/admin/daftar-pasien-offline');
      }

      const { namaUser, email, tanggalLahir, alamat, nomorTelepon, jadwalId } = req.body;

      // Cek apakah email sudah terdaftar
      const checkEmailQuery = 'SELECT idUser FROM user WHERE email = ?';
      connection.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Terjadi kesalahan saat memeriksa email');
            res.redirect('/admin/daftar-pasien-offline');
          });
        }

        let createBooking = (pasienId) => {
          // Insert booking
          const insertBookingQuery = 'INSERT INTO booking (pasienId, jadwalId, tanggalBooking, metodePendaftaran, status, nomorAntrian, statusAntrian) VALUES (?, ?, NOW(), "offline", "aktif", NULL, "menunggu")';
          connection.query(insertBookingQuery, [pasienId, jadwalId], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Terjadi kesalahan saat membuat booking');
                res.redirect('/admin/daftar-pasien-offline');
              });
            }

            // Update kuota
            const updateQuotaQuery = 'UPDATE jadwal_dokter SET sisaKuotaOffline = sisaKuotaOffline - 1 WHERE idJadwal = ? AND sisaKuotaOffline > 0';
            connection.query(updateQuotaQuery, [jadwalId], (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  req.flash('error', 'Terjadi kesalahan saat update kuota');
                  res.redirect('/admin/daftar-pasien-offline');
                });
              }

              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    req.flash('error', 'Terjadi kesalahan saat menyimpan data');
                    res.redirect('/admin/daftar-pasien-offline');
                  });
                }

                connection.release();
                req.flash('success', 'Pasien berhasil didaftarkan! Silahkan atur nomor antrian di halaman Manage Queue');
                res.redirect('/admin/kelola-antrian?metode=offline');
              });
            });
          });
        };

        if (results.length > 0) {
          // Email sudah terdaftar, gunakan ID yang ada
          createBooking(results[0].idUser);
        } else {
          // Email belum terdaftar, buat user baru
          bcrypt.hash(nomorTelepon, 10, (err, hashedPassword) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Terjadi kesalahan saat enkripsi password');
                res.redirect('/admin/daftar-pasien-offline');
              });
            }

            const insertUserQuery = 'INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, ?, "pasien")';
            connection.query(insertUserQuery, [namaUser, email, hashedPassword, tanggalLahir, alamat, nomorTelepon], (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  req.flash('error', 'Terjadi kesalahan saat mendaftarkan pasien');
                  res.redirect('/admin/daftar-pasien-offline');
                });
              }

              createBooking(result.insertId);
            });
          });
        }
      });
    });
  });
});

// Get Doctor Schedule Endpoint
app.get('/admin/jadwal-dokter/:id', isAuthenticated, (req, res) => {
  const dokterId = req.params.id;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[new Date().getDay()];

  const query = `
    SELECT idJadwal, 
           TIME_FORMAT(jamMulai, '%H:%i') as jamMulai, 
           TIME_FORMAT(jamSelesai, '%H:%i') as jamSelesai, 
           sisaKuotaOffline
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

// Manage Queue Routes
app.get('/admin/kelola-antrian', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const metodePendaftaran = req.query.metode || 'online';

  const query = `
    SELECT b.*, u.namaUser, u.nomorTelepon, jd.hari, jd.jamMulai, jd.jamSelesai, 
           d.namaUser as namaDokter
    FROM booking b
    JOIN user u ON b.pasienId = u.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterId = d.idUser
    WHERE b.status = 'aktif' 
    AND b.nomorAntrian IS NULL 
    AND b.metodePendaftaran = ?
    AND DATE(b.tanggalBooking) = CURDATE()
    ORDER BY b.tanggalBooking
  `;

  pool.query(query, [metodePendaftaran], (err, bookings) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Terjadi kesalahan saat memuat data');
      return res.redirect('/admin/dashboard');
    }

    res.render('admin/kelola-antrian', {
      user: req.session.user,
      bookings: bookings,
      metodePendaftaran: metodePendaftaran,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

app.post('/admin/assign-antrian', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { bookingId, nomorAntrian, metodePendaftaran } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      req.flash('error', 'Terjadi kesalahan koneksi database');
      return res.redirect('/admin/kelola-antrian');
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        req.flash('error', 'Terjadi kesalahan saat memulai transaksi');
        return res.redirect('/admin/kelola-antrian');
      }

      // Update nomor antrian
      const updateQuery = 'UPDATE booking SET nomorAntrian = ? WHERE idBooking = ?';
      connection.query(updateQuery, [nomorAntrian, bookingId], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Gagal mengupdate nomor antrian');
            res.redirect('/admin/kelola-antrian');
          });
        }

        // Commit transaksi
        connection.commit(err => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              req.flash('error', 'Gagal menyimpan perubahan');
              res.redirect('/admin/kelola-antrian');
            });
          }

          connection.release();
          req.flash('success', 'Nomor antrian berhasil ditetapkan');
          res.redirect(`/admin/kelola-antrian?metode=${metodePendaftaran}`);
        });
      });
    });
  });
});

// Kelola Jadwal Dokter
app.get('/admin/kelola-jadwal-dokter', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT jd.*, u.namaUser 
    FROM jadwal_dokter jd
    JOIN user u ON jd.dokterId = u.idUser
    ORDER BY u.namaUser, jd.hari
  `;

  pool.query(query, (err, schedules) => {
    if (err) {
      req.flash('error', 'Terjadi kesalahan saat memuat jadwal');
      return res.redirect('/admin/dashboard');
    }

    pool.query('SELECT * FROM user WHERE role = "dokter"', (err, doctors) => {
      if (err) {
        req.flash('error', 'Terjadi kesalahan saat memuat data dokter');
        return res.redirect('/admin/dashboard');
      }

      res.render('admin/kelola-jadwal-dokter', {
        user: req.session.user,
        schedules: schedules,
        doctors: doctors,
        success: req.flash('success'),
        error: req.flash('error')
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
      console.error('Error:', err); // Tambahkan log error
      req.flash('error', 'Gagal menambah jadwal dokter');
      return res.redirect('/admin/kelola-jadwal-dokter');
    }

    req.flash('success', 'Jadwal dokter berhasil ditambahkan');
    res.redirect('/admin/kelola-jadwal-dokter');
  });
});

app.post('/admin/update-jadwal', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { idJadwal, dokterId, hari, jamMulai, jamSelesai, kuotaOnline, kuotaOffline } = req.body;

  const query = `
    UPDATE jadwal_dokter 
    SET dokterId = ?, 
        hari = ?, 
        jamMulai = ?, 
        jamSelesai = ?, 
        kuotaOnline = ?, 
        kuotaOffline = ?,
        sisaKuotaOnline = ?,
        sisaKuotaOffline = ?
    WHERE idJadwal = ?
  `;

  pool.query(query, [
    dokterId,
    hari,
    jamMulai,
    jamSelesai,
    kuotaOnline,
    kuotaOffline,
    kuotaOnline,
    kuotaOffline,
    idJadwal
  ], (err) => {
    if (err) {
      req.flash('error', 'Gagal mengupdate jadwal dokter');
      return res.redirect('/admin/kelola-jadwal-dokter');
    }

    req.flash('success', 'Jadwal dokter berhasil diupdate');
    res.redirect('/admin/kelola-jadwal-dokter');
  });
});

app.post('/admin/delete-jadwal', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { idJadwal } = req.body;

  // Check if there are any active bookings for this schedule
  const checkBookingQuery = `
    SELECT COUNT(*) as bookingCount 
    FROM booking 
    WHERE jadwalId = ? AND status = 'aktif'
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      req.flash('error', 'Terjadi kesalahan koneksi database');
      return res.redirect('/admin/kelola-jadwal-dokter');
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        req.flash('error', 'Terjadi kesalahan saat memulai transaksi');
        return res.redirect('/admin/kelola-jadwal-dokter');
      }

      // First check for active bookings
      connection.query(checkBookingQuery, [idJadwal], (err, results) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Terjadi kesalahan saat memeriksa booking aktif');
            res.redirect('/admin/kelola-jadwal-dokter');
          });
        }

        if (results[0].bookingCount > 0) {
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Tidak dapat menghapus jadwal karena masih ada booking aktif');
            res.redirect('/admin/kelola-jadwal-dokter');
          });
        }

        // If no active bookings, proceed with deletion
        const deleteQuery = 'DELETE FROM jadwal_dokter WHERE idJadwal = ?';
        connection.query(deleteQuery, [idJadwal], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              req.flash('error', 'Gagal menghapus jadwal dokter');
              res.redirect('/admin/kelola-jadwal-dokter');
            });
          }

          connection.commit(err => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Terjadi kesalahan saat menyimpan perubahan');
                res.redirect('/admin/kelola-jadwal-dokter');
              });
            }

            connection.release();
            req.flash('success', 'Jadwal dokter berhasil dihapus');
            res.redirect('/admin/kelola-jadwal-dokter');
          });
        });
      });
    });
  });
});

// Route untuk menampilkan halaman transaksi
app.get('/admin/transaksi', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT b.*, 
           p.namaUser as namaPasien, 
           p.nomorTelepon,
           d.namaUser as namaDokter,
           jd.dokterId,
           d.biayaKonsultasi
    FROM booking b
    JOIN user p ON b.pasienId = p.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterId = d.idUser
    WHERE b.statusAntrian = 'selesai' 
    AND (b.statusPembayaran = 'belum_bayar' OR b.statusPembayaran IS NULL)
    ORDER BY b.tanggalBooking DESC
  `;

  pool.query(query, (err, bookings) => {
    if (err) {
      console.error('Error:', err);
      req.flash('error', 'Terjadi kesalahan saat memuat data transaksi');
      return res.redirect('/admin/transaksi');
    }

    res.render('admin/transaksi', {
      user: req.session.user,
      bookings: bookings,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

// Controller untuk proses pembayaran
app.post('/admin/proses-pembayaran', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { bookingId, metodePembayaran } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Connection error:', err);
      req.flash('error', 'Terjadi kesalahan koneksi database');
      return res.redirect('/admin/transaksi');
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error('Transaction error:', err);
        req.flash('error', 'Terjadi kesalahan saat memulai transaksi');
        return res.redirect('/admin/transaksi');
      }

      // Get booking data
      const getBookingQuery = `
        SELECT b.pasienId, jd.dokterId, d.biayaKonsultasi
        FROM booking b
        JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
        JOIN user d ON jd.dokterId = d.idUser
        WHERE b.idBooking = ?
      `;

      connection.query(getBookingQuery, [bookingId], (err, results) => {
        if (err || results.length === 0) {
          console.error('Booking query error:', err);
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Gagal mendapatkan data booking');
            res.redirect('/admin/transaksi');
          });
        }

        const { pasienId, dokterId, biayaKonsultasi } = results[0];

        // Insert transaction dengan query yang sesuai struktur tabel
        const insertTransaksiQuery = `
          INSERT INTO transaksi 
          (pasienId, dokterId, totalBiaya, status, tanggal)
          VALUES (?, ?, ?, 'Lunas', NOW())
        `;

        connection.query(insertTransaksiQuery,
          [pasienId, dokterId, biayaKonsultasi],
          (err) => {
            if (err) {
              console.error('Insert transaction error:', err);
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Gagal membuat transaksi');
                res.redirect('/admin/transaksi');
              });
            }

            // Update booking status
            const updateBookingQuery = `
              UPDATE booking 
              SET statusPembayaran = 'lunas'
              WHERE idBooking = ?
            `;

            connection.query(updateBookingQuery, [bookingId], (err) => {
              if (err) {
                console.error('Update booking error:', err);
                return connection.rollback(() => {
                  connection.release();
                  req.flash('error', 'Gagal mengupdate status pembayaran');
                  res.redirect('/admin/transaksi');
                });
              }

              connection.commit(err => {
                if (err) {
                  console.error('Commit error:', err);
                  return connection.rollback(() => {
                    connection.release();
                    req.flash('error', 'Gagal menyimpan transaksi');
                    res.redirect('/admin/transaksi');
                  });
                }

                connection.release();
                req.flash('success', 'Pembayaran berhasil dikonfirmasi');
                res.redirect('/admin/transaksi');
              });
            });
          }
        );
      });
    });
  });
});


//-------------------------------------------------------------------------------------------------
// Doctor Routes
app.get('/dokter/halaman-dokter', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'dokter') {
    return res.redirect('/dashboard');
  }

  const dokterId = req.session.user.idUser;

  // Query untuk jadwal hari ini
  const queryJadwalHariIni = `
    SELECT jadwalId, jamMulai, jamSelesai, 
           sisaKuotaOnline, sisaKuotaOffline
    FROM jadwal_dokter
    WHERE dokterId = ?
    AND hari = (
      SELECT CASE DAYOFWEEK(NOW())
        WHEN 1 THEN 'Minggu'
        WHEN 2 THEN 'Senin'
        WHEN 3 THEN 'Selasa'
        WHEN 4 THEN 'Rabu'
        WHEN 5 THEN 'Kamis'
        WHEN 6 THEN 'Jumat'
        WHEN 7 THEN 'Sabtu'
      END
    )
  `;

  // Query untuk antrian pasien hari ini
  const queryAntrianPasien = `
    SELECT b.*, u.namaUser, u.nomorTelepon 
    FROM booking b
    JOIN user u ON b.pasienId = u.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    WHERE jd.dokterId = ?
    AND DATE(b.tanggalBooking) = CURDATE()
    AND b.status = 'aktif'
    ORDER BY b.nomorAntrian ASC
  `;

  pool.query(queryJadwalHariIni, [dokterId], (err, jadwal) => {
    if (err) {
      req.flash('error', 'Gagal memuat jadwal');
      return res.redirect('/dashboard');
    }

    pool.query(queryAntrianPasien, [dokterId], (err, antrian) => {
      if (err) {
        req.flash('error', 'Gagal memuat antrian');
        return res.redirect('/dashboard');
      }

      res.render('dokter/halaman-dokter', {
        user: req.session.user,
        jadwal: jadwal,
        antrian: antrian,
        success: req.flash('success'),
        error: req.flash('error')
      });
    });
  });
});




//-------------------------------------------------------------------------------------------------
// Patient Routes
app.get('/halaman-pasien', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'pasien') {
    return res.redirect('/dashboard');
  }

  const pasienId = req.session.user.idUser;

  // Query untuk booking aktif
  const queryBookingAktif = `
    SELECT b.*, d.namaUser as namaDokter, 
           jd.jamMulai, jd.jamSelesai
    FROM booking b
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterId = d.idUser
    WHERE b.pasienId = ?
    AND b.status = 'aktif'
    AND DATE(b.tanggalBooking) = CURDATE()
  `;

  // Query untuk riwayat medis
  const queryRiwayatMedis = `
    SELECT rm.*, d.namaUser as namaDokter
    FROM riwayat_medis rm
    JOIN booking b ON rm.bookingId = b.idBooking
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterId = d.idUser
    WHERE rm.idPasien = ?
    ORDER BY rm.tanggal DESC
  `;

  pool.query(queryBookingAktif, [pasienId], (err, booking) => {
    if (err) {
      req.flash('error', 'Gagal memuat data booking');
      return res.redirect('/dashboard');
    }

    pool.query(queryRiwayatMedis, [pasienId], (err, riwayat) => {
      if (err) {
        req.flash('error', 'Gagal memuat riwayat medis');
        return res.redirect('/dashboard');
      }

      res.render('pasien/halaman-pasien', {
        user: req.session.user,
        booking: booking,
        riwayat: riwayat,
        success: req.flash('success'),
        error: req.flash('error')
      });
    });
  });
});

// Booking for Patient
app.get('/pilih-jadwal', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'pasien') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT jd.*, d.namaUser as namaDokter
    FROM jadwal_dokter jd
    JOIN user d ON jd.dokterId = d.idUser 
    WHERE jd.sisaKuotaOnline > 0
    ORDER BY jd.hari, jd.jamMulai
  `;

  pool.query(query, (err, jadwal) => {
    if (err) {
      req.flash('error', 'Gagal memuat jadwal');
      return res.redirect('/halaman-pasien');
    }

    res.render('pasien/pilih-jadwal', {
      user: req.session.user,
      jadwal: jadwal,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

app.post('/booking', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'pasien') {
    return res.redirect('/dashboard');
  }

  const { jadwalId } = req.body;
  const pasienId = req.session.user.idUser;

  pool.getConnection((err, connection) => {
    if (err) {
      req.flash('error', 'Gagal koneksi database');
      return res.redirect('/pilih-jadwal');
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        req.flash('error', 'Gagal memulai transaksi');
        return res.redirect('/pilih-jadwal');
      }

      // Insert booking
      const insertQuery = `
        INSERT INTO booking 
        (pasienId, jadwalId, tanggalBooking, metodePendaftaran, status, statusAntrian) 
        VALUES (?, ?, NOW(), 'online', 'aktif', 'menunggu')
      `;

      connection.query(insertQuery, [pasienId, jadwalId], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            req.flash('error', 'Gagal melakukan booking');
            res.redirect('/pilih-jadwal');
          });
        }

        // Update kuota
        const updateQuery = `
          UPDATE jadwal_dokter 
          SET sisaKuotaOnline = sisaKuotaOnline - 1 
          WHERE idJadwal = ? 
          AND sisaKuotaOnline > 0
        `;

        connection.query(updateQuery, [jadwalId], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              req.flash('error', 'Gagal update kuota');
              res.redirect('/pilih-jadwal');
            });
          }

          connection.commit(err => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Gagal menyimpan perubahan');
                res.redirect('/pilih-jadwal');
              });
            }

            connection.release();
            req.flash('success', 'Booking berhasil');
            res.redirect('/halaman-pasien');
          });
        });
      });
    });
  });
});



//-------------------------------------------------------------------------------------------------
app.get('/halaman-dokter', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'dokter') {
    req.flash('error', 'Anda tidak memiliki akses ke halaman ini');
    return res.redirect('/');
  }

  const dokterId = req.session.user.idUser;

  // 1. Query untuk data dokter
  const queryDokter = `
    SELECT idUser, namaUser as namaDokter
    FROM user 
    WHERE idUser = ? AND role = 'dokter'
  `;

  // 2. Query untuk jadwal dokter
  const queryJadwal = `
    SELECT idJadwal, hari, jamMulai, jamSelesai 
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

  // 3. Query untuk data pasien hari ini
  const queryPasien = `
  SELECT 
    b.idBooking,
    b.pasienId,
    u.namaUser as pasien,
    u.nomorTelepon,
    DATE_FORMAT(b.tanggalBooking, '%d %M %Y %H:%i') as tanggalBooking,
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
  AND b.statusAntrian = 'dipanggil'
  ORDER BY b.nomorAntrian ASC
`;

  // Eksekusi query secara berurutan
  pool.query(queryDokter, [dokterId], (errDokter, dokterResult) => {
    if (errDokter) {
      console.error('Error mengambil data dokter:', errDokter);
      req.flash('error', 'Gagal memuat data dokter');
      return res.redirect('/');
    }

    // Jika data dokter ditemukan, lanjut ambil jadwal
    pool.query(queryJadwal, [dokterId], (errJadwal, jadwalResult) => {
      if (errJadwal) {
        console.error('Error mengambil jadwal:', errJadwal);
        req.flash('error', 'Gagal memuat jadwal');
        return res.redirect('/');
      }

      // Terakhir ambil data pasien
      pool.query(queryPasien, [dokterId], (errPasien, pasienResult) => {
        if (errPasien) {
          console.error('Error mengambil data pasien:', errPasien);
          req.flash('error', 'Gagal memuat data pasien');
          return res.redirect('/');
        }

        // Format tanggal untuk data pasien
        const formattedPasienResult = pasienResult.map(pasien => ({
          ...pasien,
          tanggalBooking: pasien.tanggalBooking 
            ? new Date(pasien.tanggalBooking).toLocaleDateString('id-ID', {
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
          dokter: dokterResult[0],
          jadwal: jadwalResult,
          daftarPasien: formattedPasienResult,
          messages: {
            error: req.flash('error'),
            success: req.flash('success')
          }
        });
      });
    });
  });
});


app.get('/riwayat_medis', (req, res) => {
  // Cek apakah user sudah login
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Jika user adalah dokter, lanjutkan
  if (req.session.user.role !== 'dokter') {
    return res.status(403).send('Akses ditolak');
  }

  // Query untuk mengambil data riwayat medis
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

app.post('/input-diagnosa', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'dokter') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { bookingId, pasienId, diagnosa, resep } = req.body;
  const dokterId = req.session.user.idUser;

  const query = `
    INSERT INTO riwayat_medis (
      bookingId,
      idPasien,
      tanggal,
      diagnosa,
      resep
    ) VALUES (?, ?, NOW(), ?, ?)
  `;

  pool.query(query, 
    [bookingId, pasienId, diagnosa, resep],
    (err, result) => {
      if (err) {
        console.error('Error menyimpan diagnosa:', err);
        req.flash('error', 'Gagal menyimpan diagnosa');
        return res.redirect('/halaman-dokter');
      }

      // Update status booking
      pool.query(
        'UPDATE booking SET statusAntrian = ?, status = ? WHERE idBooking = ?',
        ['selesai', 'selesai', bookingId],
        (updateErr) => {
          if (updateErr) {
            console.error('Error update status booking:', updateErr);
            req.flash('error', 'Gagal mengupdate status booking');
            return res.redirect('/halaman-dokter');
          }

          req.flash('success', 'Diagnosa berhasil disimpan');
          res.redirect('/halaman-dokter');
        }
      );
    }
  );
});


//-------------------------------------------------------------------------------------------------


app.get('/perawat/halaman-perawat', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'perawat') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT b.idBooking, b.pasienId, p.namaUser AS namaPasien, 
           jd.hari, jd.jamMulai, jd.jamSelesai, b.statusAntrian,
           d.namaUser AS namaDokter, b.nomorAntrian
    FROM booking b
    JOIN user p ON b.pasienId = p.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterID = d.idUser
    WHERE b.status = 'aktif'
    ORDER BY 
      CASE b.statusAntrian 
        WHEN 'menunggu' THEN 1 
        WHEN 'dipanggil' THEN 2 
        WHEN 'selesai' THEN 3 
      END,
      jd.hari, 
      jd.jamMulai
  `;

  pool.query(query, (err, bookings) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      req.flash('error', 'Gagal memuat data booking');
      return res.redirect('/dashboard');
    }

    res.render('perawat/halaman-perawat', {
      user: req.session.user,
      bookings: bookings,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

app.get('/perawat/halaman-perawat', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'perawat') {
    return res.redirect('/dashboard');
  }

  const query = `
    SELECT b.idBooking, b.pasienId, p.namaUser AS namaPasien, 
           jd.hari, jd.jamMulai, jd.jamSelesai, b.statusAntrian,
           d.namaUser AS namaDokter, b.nomorAntrian
    FROM booking b
    JOIN user p ON b.pasienId = p.idUser
    JOIN jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN user d ON jd.dokterID = d.idUser
    WHERE b.status = 'aktif' AND b.nomorAntrian IS NOT NULL
    ORDER BY 
      CASE b.statusAntrian 
        WHEN 'menunggu' THEN 1 
        WHEN 'dipanggil' THEN 2 
        WHEN 'selesai' THEN 3 
      END,
      jd.hari, 
      jd.jamMulai
  `;

  pool.query(query, (err, bookings) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      req.flash('error', 'Gagal memuat data booking');
      return res.redirect('/dashboard');
    }

    res.render('perawat/halaman-perawat', {
      user: req.session.user,
      bookings: bookings,
      success: req.flash('success'),
      error: req.flash('error')
    });
  });
});

app.post('/perawat/halaman-perawat', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'perawat') {
    return res.redirect('/dashboard');
  }

  const { bookingId, currentStatus, catatan, diagnosa } = req.body;

  // Tentukan status baru berdasarkan currentStatus
  let newStatus;
  if (currentStatus === 'menunggu') {
    newStatus = 'dipanggil';
  } else if (currentStatus === 'dipanggil') {
    newStatus = 'selesai';
  } else {
    req.flash('error', 'Status tidak valid');
    return res.redirect('/perawat/halaman-perawat');
  }

  // Update status booking
  const updateQuery = `
    UPDATE booking 
    SET statusAntrian = ?, 
        status = CASE WHEN ? = 'selesai' THEN 'selesai' ELSE status END
    WHERE idBooking = ?
  `;

  pool.query(updateQuery, [newStatus, newStatus, bookingId], (err, result) => {
    if (err) {
      console.error('Error updating booking status:', err);
      req.flash('error', 'Gagal mengupdate status booking');
      return res.redirect('/perawat/halaman-perawat');
    }

    // Jika status booking menjadi 'selesai', lakukan update pada rekam medis
    if (newStatus === 'selesai') {
      const insertMedicalRecordQuery = `
        INSERT INTO rekam_medis (bookingId, catatan, diagnosa, perawatId, tanggalPemeriksaan)
        VALUES (?, ?, ?, ?, NOW())
      `;

      pool.query(updateMedicalRecordQuery, [
        catatan || null,
        diagnosa || null,
        req.session.user.idUser, // Ambil perawatId dari session user
        bookingId
      ], (medicalRecordErr) => {
        if (medicalRecordErr) {
          console.error('Error updating medical record:', medicalRecordErr);
          req.flash('error', 'Gagal memperbarui rekam medis');
          return res.redirect('/perawat/halaman-perawat');
        }

        // Beri feedback sukses dan arahkan kembali ke halaman perawat
        req.flash('success', 'Status booking berhasil diupdate dan rekam medis berhasil diperbarui');
        res.redirect('/perawat/halaman-perawat');
      });
    } else {
      // Jika status tidak perlu diperbarui, beri feedback sukses
      req.flash('success', 'Status booking berhasil diupdate');
      res.redirect('/perawat/halaman-perawat');
    }
  });
});

import multer from 'multer';

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads')); // Direktori penyimpanan
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Route untuk menampilkan halaman catat rekam medis
// Route untuk menampilkan halaman catat rekam medis
app.get('/perawat/catat-rekam-medis/:idBooking', isAuthenticated, (req, res) => {
  const { idBooking } = req.params;

  // Validasi idBooking
  if (!idBooking || isNaN(idBooking)) {
    req.flash('error', 'ID Booking tidak valid');
    return res.redirect('/perawat/halaman-perawat');
  }

  pool.query(
    `SELECT 
      b.idBooking, b.pasienId, b.nomorAntrian, b.statusAntrian, 
      p.namaUser AS namaPasien, d.namaUser AS namaDokter
    FROM 
      booking b
    JOIN 
      user p ON b.pasienId = p.idUser
    JOIN 
      jadwal_dokter jd ON b.jadwalId = jd.idJadwal
    JOIN 
      user d ON jd.dokterId = d.idUser
    WHERE 
      b.idBooking = ?`,
    [idBooking],
    (bookingError, bookingResults) => {
      if (bookingError) {
        console.error('Error fetching booking details:', bookingError);
        req.flash('error', 'Gagal memuat data booking');
        return res.redirect('/perawat/halaman-perawat');
      }

      if (bookingResults.length === 0) {
        req.flash('error', 'Data booking tidak ditemukan');
        return res.redirect('/perawat/halaman-perawat');
      }

      res.render('perawat/catat-rekam-medis', {
        booking: bookingResults[0],
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    }
  );
});

app.post('/catat-rekam-medis', isAuthenticated, (req, res) => {
  const { idBooking, diagnosa } = req.body;

  if (!idBooking || !diagnosa) {
    req.flash('error', 'Data tidak lengkap');
    return res.redirect(`/catat-rekam-medis/${idBooking}`);
  }

  pool.query(
    `INSERT INTO riwayat_medis (idBooking, diagnosa, tanggal)
     VALUES (?, ?, NOW())`,
    [idBooking, diagnosa],
    (err) => {
      if (err) {
        console.error('Error inserting medical record:', err);
        req.flash('error', 'Gagal menyimpan rekam medis');
        return res.redirect(`/catat-rekam-medis/${idBooking}`);
      }

      req.flash('success', 'Rekam medis berhasil disimpan');
      res.redirect('/perawat/halaman-perawat');
    }
  );
});


// Route untuk menangani form rekam medis
// Route untuk menangani form rekam medis
// Route untuk menangani form rekam medis
// Route untuk menangani form rekam medis
app.post('/perawat/catat-rekam-medis', isAuthenticated, upload.single('dokumenMedis'), (req, res) => {
  const { 
    bookingId,
    pasienId, 
    tekananDarah, 
    tinggiBadan, 
    beratBadan, 
    suhuBadan, 
    keluhanPasien,
    currentStatus
  } = req.body;

  // Cek apakah ada file yang diupload
  const dokumenMedisPath = req.file ? `/uploads/${req.file.filename}` : null;

  // Simpan rekam medis
  pool.query(
    `INSERT INTO riwayat_medis (
      bookingId,
      idPasien, 
      tanggal, 
      tekanan_darah, 
      tinggi_badan, 
      berat_badan, 
      suhu_badan, 
      keluhan_pasien,
      dokumen_medis
    ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      pasienId, 
      tekananDarah, 
      tinggiBadan, 
      beratBadan, 
      suhuBadan, 
      keluhanPasien,
      dokumenMedisPath
    ],
    (error, results) => {
      if (error) {
        console.error('Error inserting medical record:', error);
        req.flash('error', 'Gagal menyimpan rekam medis');
        return res.redirect(`/perawat/catat-rekam-medis/${bookingId}`);
      }

      // Update status booking jika perlu
      if (currentStatus === 'selesai') {
        pool.query(
          'UPDATE booking SET statusAntrian = ?, status = ? WHERE idBooking = ?',
          ['selesai', 'selesai', bookingId],
          (updateError) => {
            if (updateError) {
              console.error('Error updating booking status:', updateError);
            }
          }
        );
      }

      req.flash('success', 'Rekam medis berhasil disimpan');
      res.redirect('/perawat/halaman-perawat');
    }
  );
});

app.get('/lihat-data-pasien', isAuthenticated, (req, res) => {
  pool.query(
      `SELECT 
          rm.idRiwayatMedis, u.namaUser AS namaPasien, rm.tanggal, rm.tekanan_darah, 
          rm.tinggi_badan, rm.berat_badan, rm.suhu_badan, rm.keluhan_pasien, rm.dokumen_medis
       FROM riwayat_medis rm
       JOIN user u ON rm.idPasien = u.idUser`,
      (err, results) => {
          if (err) {
              console.error('Error:', err);
              return res.status(500).send('Gagal mengambil data pasien');
          }
          res.render('dokter/lihat-data-pasien', { riwayatMedis: results });
      }
  );
});

app.get('/diagnosa/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;

  pool.query('SELECT * FROM riwayat_medis WHERE idRiwayatMedis = ?', [id], (err, result) => {
      if (err) {
          console.error(err);
          req.flash('error', 'Gagal memuat data pasien.');
          return res.redirect('/lihat-data-pasien');
      }

      if (result.length === 0) {
          req.flash('error', 'Data tidak ditemukan.');
          return res.redirect('/lihat-data-pasien');
      }

      res.render('dokter/diagnosa', { pasien: result[0] });
  });
});

app.post('/diagnosa/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  const { diagnosa, resep, catatan } = req.body;

  const query = `
      UPDATE riwayat_medis 
      SET diagnosa = ?, resep = ?, catatan = ?
      WHERE idRiwayatMedis = ?
  `;

  pool.query(query, [diagnosa, resep, catatan, id], (err) => {
      if (err) {
          console.error(err);
          req.flash('error', 'Gagal menyimpan diagnosa.');
          return res.redirect(`/diagnosa/${id}`);
      }

      req.flash('success', 'Diagnosa berhasil disimpan.');
      res.redirect('/lihat-data-pasien');
  });
});


app.get('/edit-data-pasien/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;

  pool.query('SELECT * FROM riwayat_medis WHERE idRiwayatMedis = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Gagal mengambil data pasien.');
    }

    res.render('dokter/edit-data-pasien', { data: result[0] });
  });
});

app.post('/edit-data-pasien/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  const { tekanan_darah, tinggi_badan, berat_badan, suhu_badan, keluhan_pasien } = req.body;

  const query = `
    UPDATE riwayat_medis 
    SET tekanan_darah = ?, tinggi_badan = ?, berat_badan = ?, suhu_badan = ?, keluhan_pasien = ?
    WHERE idRiwayatMedis = ?
  `;

  pool.query(query, [tekanan_darah, tinggi_badan, berat_badan, suhu_badan, keluhan_pasien, id], (err) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Gagal memperbarui data pasien.');
      return res.redirect('/lihat-data-pasien');
    }

    req.flash('success', 'Data pasien berhasil diperbarui.');
    res.redirect('/lihat-data-pasien');
  });
});
app.post('/delete-data-pasien/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;

  pool.query('DELETE FROM riwayat_medis WHERE idRiwayatMedis = ?', [id], (err) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Gagal menghapus data pasien.');
      return res.redirect('/lihat-data-pasien');
    }

    req.flash('success', 'Data pasien berhasil dihapus.');
    res.redirect('/lihat-data-pasien');
  });
});

//-------------------------------------------------------------------------------------------------
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
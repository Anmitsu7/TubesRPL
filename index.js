import express from 'express';
import bodyParser from 'body-parser';
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
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 3600000 
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
      req.flash('error', 'Server error');
      return res.redirect('/login');
    }

    if (results.length === 0) {
      req.flash('error', 'User tidak ditemukan!');
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
          req.session.user = {
            idUser: user.idUser,
            namaUser: user.namaUser,
            email: user.email,
            role: user.role
          };
          res.redirect('/dashboard');
        } else {
          req.flash('error', 'Password salah!');
          res.redirect('/login');
        }
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Server error');
        res.redirect('/login');
      });
  });
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, (req, res) => {
  const { role } = req.session.user;
  
  switch(role) {
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




//-------------------------------------------------------------------------------------------------
// Admin Routes
app.get('/halaman-admin', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
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
    if(err) {
      req.flash('error', 'Terjadi kesalahan koneksi database');
      return res.redirect('/admin/daftar-pasien-offline');
    }

    connection.beginTransaction(err => {
      if(err) {
        connection.release();
        req.flash('error', 'Terjadi kesalahan saat memulai transaksi');
        return res.redirect('/admin/daftar-pasien-offline');  
      }

      const { namaUser, email, tanggalLahir, alamat, nomorTelepon, jadwalId } = req.body;

      // Cek apakah email sudah terdaftar
      const checkEmailQuery = 'SELECT idUser FROM user WHERE email = ?';
      connection.query(checkEmailQuery, [email], (err, results) => {
        if(err) {
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
            if(err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Terjadi kesalahan saat membuat booking');
                res.redirect('/admin/daftar-pasien-offline');
              });
            }

            // Update kuota
            const updateQuotaQuery = 'UPDATE jadwal_dokter SET sisaKuotaOffline = sisaKuotaOffline - 1 WHERE idJadwal = ? AND sisaKuotaOffline > 0';
            connection.query(updateQuotaQuery, [jadwalId], (err) => {
              if(err) {
                return connection.rollback(() => {
                  connection.release();
                  req.flash('error', 'Terjadi kesalahan saat update kuota');
                  res.redirect('/admin/daftar-pasien-offline');
                });
              }

              connection.commit((err) => {
                if(err) {
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
            if(err) {
              return connection.rollback(() => {
                connection.release();
                req.flash('error', 'Terjadi kesalahan saat enkripsi password');
                res.redirect('/admin/daftar-pasien-offline');
              });
            }

            const insertUserQuery = 'INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, ?, "pasien")';
            connection.query(insertUserQuery, [namaUser, email, hashedPassword, tanggalLahir, alamat, nomorTelepon], (err, result) => {
              if(err) {
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
      req.flash('error', 'Gagal menambah jadwal dokter');
      return res.redirect('/admin/kelola-jadwal-dokter');
    }

    req.flash('success', 'Jadwal dokter berhasil ditambahkan');
    res.redirect('/admin/kelola-jadwal-dokter');
  });
});



//-------------------------------------------------------------------------------------------------
// Doctor Routes
app.get('/halaman-dokter', isAuthenticated, (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
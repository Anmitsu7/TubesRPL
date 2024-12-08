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
    res.render('halaman-pasien', { user: req.session.user });
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
app.get('/admin/daftar-pasien-offline', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  // Fetch doctors with their schedules
  const query = `
    SELECT u.idUser, u.namaUser, 
           GROUP_CONCAT(
             CONCAT(j.hari, ': ', 
                    TIME_FORMAT(j.jamMulai, '%H:%i'), 
                    ' - ', 
                    TIME_FORMAT(j.jamSelesai, '%H:%i'), 
                    ' (Sisa Kuota Offline: ', 
                    j.sisaKuotaOffline, ')'
             ) SEPARATOR '; '
           ) AS jadwal
    FROM user u
    LEFT JOIN jadwal_dokter j ON u.idUser = j.dokterId
    WHERE u.role = 'dokter'
    GROUP BY u.idUser, u.namaUser
  `;

  pool.query(query, (err, doctors) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    
    res.render('admin/daftar-pasien-offline', { 
      user: req.session.user, 
      doctors: doctors
    });
  });
});

app.post('/admin/daftar-pasien-offline', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }

  const { namaUser, email, tanggalLahir, alamat, nomorTelepon, dokterId, jadwalId } = req.body;

  // First, check if user exists
  pool.query('SELECT * FROM user WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    const registerPatient = (userId) => {
      // Create booking
      const bookingQuery = `
        INSERT INTO booking (pasienId, jadwalId, tanggalBooking, metodePendaftaran, status, nomorAntrian) 
        VALUES (?, ?, NOW(), 'offline', 'aktif', ?)
      `;

      // Generate a simple queue number
      const nomorAntrian = `A${Math.floor(Math.random() * 100)}`;

      pool.query(bookingQuery, [userId, jadwalId, nomorAntrian], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error creating booking');
        }
        
        // Update doctor's schedule quota
        const updateQuotaQuery = 'UPDATE jadwal_dokter SET sisaKuotaOffline = sisaKuotaOffline - 1 WHERE idJadwal = ?';
        pool.query(updateQuotaQuery, [jadwalId], (err) => {
          if (err) {
            console.error(err);
          }
          res.redirect('/admin/daftar-pasien-offline');
        });
      });
    };

    if (existingUser.length === 0) {
      // Create new user if not exists
      const insertUserQuery = 'INSERT INTO user (namaUser, email, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, "pasien")';
      pool.query(insertUserQuery, [namaUser, email, tanggalLahir, alamat, nomorTelepon], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error registering patient');
        }
        registerPatient(result.insertId);
      });
    } else {
      registerPatient(existingUser[0].idUser);
    }
  });
});

app.get('/admin/jadwal-dokter/:dokterId', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const dokterId = req.params.dokterId;
  const query = `
    SELECT idJadwal, hari, 
           TIME_FORMAT(jamMulai, '%H:%i') as jamMulai, 
           TIME_FORMAT(jamSelesai, '%H:%i') as jamSelesai, 
           sisaKuotaOffline,
           CASE 
             WHEN hari = DAYNAME(CURRENT_DATE) THEN 1 
             ELSE 0 
           END as isToday
    FROM jadwal_dokter 
    WHERE dokterId = ? AND sisaKuotaOffline > 0
    ORDER BY isToday DESC
  `;

  pool.query(query, [dokterId], (err, schedules) => {
    if (err) {
      console.error(err);
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
// Route untuk halaman dokter
app.get('/halaman-dokter', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Arahkan ke halaman login jika belum login
  }

  const dokterId = req.session.user.idUser; // Ambil ID dokter dari session, pastikan idUser sesuai dengan kolom di tabel user

  // Query untuk mendapatkan data dokter dari tabel user
  const queryDokter = 'SELECT namaUser as namaDokter, role FROM user WHERE idUser = ? AND role = "dokter"';

  // Query untuk mendapatkan pasien yang dijadwalkan dengan dokter ini hari ini
  const queryPasien = `
    SELECT u.namaUser as pasien, b.tanggalBooking, b.metodePendaftaran, b.status, b.nomorAntrian, b.statusAntrian 
    FROM booking b
    JOIN user u ON b.pasienId = u.idUser
    WHERE b.jadwalId IN (
      SELECT idJadwal FROM jadwal_dokter WHERE dokterId = ?
    ) AND DATE(b.tanggalBooking) = CURDATE() AND b.status = 'aktif'
  `;

  // Query untuk mendapatkan jadwal dokter
  const queryJadwal = 'SELECT hari, jamMulai, jamSelesai FROM jadwal_dokter WHERE dokterId = ?';

  // Query data dokter
  pool.query(queryDokter, [dokterId], (err, dokterResult) => {
    if (err) {
      return res.status(500).send('Database error: ' + err.message);
    }

    if (dokterResult.length === 0) {
      return res.status(404).send('Dokter tidak ditemukan');
    }

    // Query data pasien
    pool.query(queryPasien, [dokterId], (err, pasienResult) => {
      if (err) {
        return res.status(500).send('Database error: ' + err.message);
      }

      // Query jadwal dokter
      pool.query(queryJadwal, [dokterId], (err, jadwalResult) => {
        if (err) {
          return res.status(500).send('Database error: ' + err.message);
        }

        // Kirim data ke template halaman-dokter.ejs
        res.render('halaman-dokter', {
          user: req.session.user, // Kirim data user (dokter) ke halaman EJS
          daftarPasien: pasienResult,
          jadwal: jadwalResult
        });
      });
    });
  });
});
// Route untuk halaman catat obat
app.get('/catat-obat', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Arahkan ke halaman login jika belum login
  }

  const perawatId = req.session.user.idUser; // Ambil ID perawat dari session

  // Query untuk mendapatkan daftar pasien yang sudah diperiksa oleh perawat
  const queryPasien = `
    SELECT p.namaUser as pasien, b.tanggalBooking, b.metodePendaftaran, b.status, b.nomorAntrian, b.statusAntrian
    FROM booking b
    JOIN user p ON b.pasienId = p.idUser
    WHERE b.perawatId = ? AND DATE(b.tanggalBooking) = CURDATE() AND b.status = 'aktif'
  `;

  pool.query(queryPasien, [perawatId], (err, pasienResult) => {
    if (err) {
      return res.status(500).send('Database error: ' + err.message);
    }

    // Kirim data ke template halaman-catat-obat.ejs
    res.render('halaman-catat-obat', {
      user: req.session.user, // Kirim data user (perawat) ke halaman EJS
      daftarPasien: pasienResult
    });
  });
});
// Route untuk halaman diagnosa
app.get('/diagnosa', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login'); // Arahkan ke halaman login jika belum login
  }

  const dokterId = req.session.user.idUser; // Ambil ID dokter dari session

  // Query untuk mendapatkan hasil diagnosa pasien
  const queryDiagnosa = `
    SELECT p.namaUser as pasien, d.hasilDiagnosa, d.tanggalDiagnosa
    FROM diagnosa d
    JOIN user p ON d.pasienId = p.idUser
    WHERE d.dokterId = ? AND DATE(d.tanggalDiagnosa) = CURDATE()
  `;

  // Query untuk mendapatkan daftar pasien yang sudah diperiksa oleh dokter hari ini
  pool.query(queryDiagnosa, [dokterId], (err, diagnosaResult) => {
    if (err) {
      return res.status(500).send('Database error: ' + err.message);
    }

    // Kirim data ke template halaman-diagnosa.ejs
    res.render('halaman-diagnosa', {
      user: req.session.user, // Kirim data user (dokter) ke halaman EJS
      diagnosaList: diagnosaResult
    });
  });
});

//-------------------------------------------------------------------------------------------------

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

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
  secret: 'your_secret_key', // Replace with a strong, unique secret
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using https
    maxAge: 3600000 // 1 hour
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
          return res.redirect('/dashboard');
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
        return res.redirect('/dashboard');
      } else {
        // Password doesn't match
        return res.render('login', { message: 'Password salah!' });
      }
    }
  });
});


app.get('/halaman-dokter', isAuthenticated, (req, res) => {
  if (req.session.user.role === 'dokter') {
    res.render('dokter-dashboard', { user: req.session.user });
  } else {
    res.status(403).send('Access Denied');
  }
});

app.get('/halaman-pasien', isAuthenticated, (req, res) => {
  if (req.session.user.role === 'pasien') {
    res.render('halaman-pasien', { user: req.session.user });
  } else {
    res.redirect('/dashboard');
  }
});



// Signup Route
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const { namaUser, email, password, tanggalLahir, alamat, nomorTelepon } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).send('Server error');

    const query = 'INSERT INTO user (namaUser, email, password, tanggalLahir, alamat, nomorTelepon, role) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    pool.query(query, [namaUser, email, hashedPassword, tanggalLahir, alamat, nomorTelepon, 'pasien'], (err) => {
      if (err) return res.status(500).send('Registration failed');
      
      res.redirect('/login?alert=success');
    });
  });
});

app.get('/login', (req, res) => {
  const alert = req.query.alert === 'success' ? 'Pendaftaran berhasil!' : null;
  res.render('login', { alert });
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, (req, res) => {
  const user = req.session.user;
  
  if (!user) {
    return res.redirect('/login');
  }

  console.log('User Role:', user.role);
  res.render('dashboard', { user }); // Pass the user object to the EJS template
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use(express.static('public'));

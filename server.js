const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Firebase Admin SDK service account key
const serviceAccount = require('./key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-bucket-name.appspot.com' // Replace with your bucket
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware to track logged-in users
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup for image uploads
const upload = multer({ dest: 'uploads/' });

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login.html');
}

// -------------------- ROUTES --------------------

// User Signup
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).send('All fields are required');
    }

    const usersRef = db.collection('users');
    const existingUserSnapshot = await usersRef.where('email', '==', email).get();
    if (!existingUserSnapshot.empty) {
      return res.status(400).send('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersRef.add({
      name,
      email,
      password: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    req.session.user = { name, email };
    return res.redirect('/profile');
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// User Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send('All fields are required');
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.status(400).send('Invalid email or password');
    }

    let userData;
    userSnapshot.forEach(doc => {
      userData = { id: doc.id, ...doc.data() };
    });

    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) {
      return res.status(400).send('Invalid email or password');
    }

    req.session.user = { name: userData.name, email: userData.email };
    return res.redirect('/profile');
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Profile page - protected
app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const blogsRef = db.collection('blogs');
    const userBlogsSnapshot = await blogsRef.where('authorEmail', '==', req.session.user.email).get();

    const userBlogs = [];
    userBlogsSnapshot.forEach(doc => {
      userBlogs.push({ id: doc.id, ...doc.data() });
    });

    res.render('profile', {
      user: req.session.user,
      blogs: userBlogs,
    });
  } catch (error) {
    console.error('Profile load error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Create new blog post
app.post('/api/blogs', isAuthenticated, async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !category || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await db.collection('blogs').add({
      title,
      category,
      content,
      authorName: req.session.user.name,
      authorEmail: req.session.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ message: 'Blog published successfully!' });
  } catch (error) {
    console.error('Create blog error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Upload image for blog
app.post('/upload-image', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const blob = bucket.file(`blog-images/${uuidv4()}_${file.originalname}`);
    const blobStream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });

    blobStream.end(fs.readFileSync(file.path));

    blobStream.on('finish', async () => {
      fs.unlinkSync(file.path); // Delete local file
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.json({ imageUrl });
    });

    blobStream.on('error', err => {
      console.error('Upload error:', err);
      fs.unlinkSync(file.path);
      res.status(500).json({ error: 'Upload failed' });
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get profile data (AJAX)
app.get('/profile/data', isAuthenticated, async (req, res) => {
  try {
    const blogsRef = db.collection('blogs');
    const userBlogsSnapshot = await blogsRef.where('authorEmail', '==', req.session.user.email).get();

    const userBlogs = [];
    userBlogsSnapshot.forEach(doc => {
      userBlogs.push({ id: doc.id, ...doc.data() });
    });

    res.json({ username: req.session.user.name, blogs: userBlogs });
  } catch (error) {
    console.error('Profile data fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Logout user
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Could not log out');
    }
    return res.redirect('/login.html');
  });
});

// Google Authentication
app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { name, email } = decodedToken;

    // Store in session
    req.session.user = { name, email };

    // Optionally add to Firestore if not exists
    const usersRef = db.collection('users');
    const userSnap = await usersRef.where('email', '==', email).get();
    if (userSnap.empty) {
      await usersRef.add({
        name,
        email,
        password: null, // since it's Google login
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.json({ message: 'Logged in with Google' });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

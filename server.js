const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config();

const serviceAccount = require('./key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'my-awesome-project-18.appspot.com', // Fixed domain typo
});
const db = admin.firestore();
const bucket = admin.storage().bucket();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'Lax',
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'uploads/' });

function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login.html');
}

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
    userSnapshot.forEach((doc) => {
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

app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { name, email } = payload;

    req.session.user = { name, email };

    const usersRef = db.collection('users');
    const userSnap = await usersRef.where('email', '==', email).get();
    if (userSnap.empty) {
      await usersRef.add({
        name,
        email,
        password: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.json({ message: 'Logged in with Google' });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const blogsRef = db.collection('blogs');
    const userBlogsSnapshot = await blogsRef.where('authorEmail', '==', req.session.user.email).get();

    const userBlogs = [];
    userBlogsSnapshot.forEach((doc) => {
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

app.post('/upload-image', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const blob = bucket.file(`blog-images/${uuidv4()}_${file.originalname}`);
    const blobStream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });

    blobStream.end(fs.readFileSync(file.path));

    blobStream.on('finish', async () => {
      fs.unlinkSync(file.path);
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.json({ imageUrl });
    });

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      fs.unlinkSync(file.path);
      res.status(500).json({ error: 'Upload failed' });
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/profile/data', isAuthenticated, async (req, res) => {
  try {
    const blogsRef = db.collection('blogs');
    const userBlogsSnapshot = await blogsRef.where('authorEmail', '==', req.session.user.email).get();

    const userBlogs = [];
    userBlogsSnapshot.forEach((doc) => {
      userBlogs.push({ id: doc.id, ...doc.data() });
    });

    res.json({ username: req.session.user.name, blogs: userBlogs });
  } catch (error) {
    console.error('Profile data fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Could not log out');
    }
    return res.redirect('/login.html');
  });
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

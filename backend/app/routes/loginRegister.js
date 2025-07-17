const router = require('express').Router();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';



  router.post('/register', async (req, res) => {
      try {
        const { username, password, email } = req.body;

        // Input validation
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3) {
          return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check for existing user with case-insensitive search
        const existingUser = await User.findOne({ 
          $or: [
            { username: { $regex: new RegExp(`^${username}$`, 'i') } },
            ...(email ? [{ email: { $regex: new RegExp(`^${email}$`, 'i') } }] : [])
          ]
        });

        if (existingUser) {
          if (existingUser.username.toLowerCase() === username.toLowerCase()) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          if (email && existingUser.email && existingUser.email.toLowerCase() === email.toLowerCase()) {
            return res.status(400).json({ error: 'Email already exists' });
          }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
  username: username.trim(),
  password: hashedPassword,
  createdAt: new Date(),
  ...(email ? { email: email.trim().toLowerCase() } : {})
});

        await user.save();
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: user._id, username: user.username, email: user.email }
        });
      } catch (error) {
        console.error('Registration error:', error);
        
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(400).json({ error: `${field} already exists` });
        }
        
        res.status(500).json({ error: 'Registration failed. Please try again.' });
      }
    });

    router.post('/login', async (req, res) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        // Case-insensitive username search
        const user = await User.findOne({ 
          username: { $regex: new RegExp(`^${username}$`, 'i') } 
        });
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
          message: 'Login successful',
          token,
          user: { id: user._id, username: user.username, email: user.email }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });


    module.exports = router;
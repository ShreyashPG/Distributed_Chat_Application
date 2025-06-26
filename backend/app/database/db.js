const mongoose = require('mongoose');

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO || 'mongodb://localhost:27017/BChat', {
      // No deprecated options
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

module.exports = connectToDB;
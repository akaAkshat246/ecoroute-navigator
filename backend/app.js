import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routeRoutes from './routes/route.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routeRoutes);

// Root test route
app.get('/health', (req, res) => {
  res.json({ status: 'UP', message: 'EcoRoute Navigator API is active' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;

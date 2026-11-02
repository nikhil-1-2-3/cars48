import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import rentalRecordRoutes from './routes/rentalRecordRoutes.js';

connectDB();

const app = express();

// ─────────────────────────────────────────────────────────────
// CORS — allow the Vercel frontend domain (set FRONTEND_URL in
// the k8s Secret / .env). Falls back to permissive in development.
// ─────────────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5174']
    : true; // allow all origins in development

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static folder for local uploads
app.use('/uploads', express.static('uploads'));

// ─────────────────────────────────────────────────────────────
// Health check — used by Kubernetes liveness / readiness probes
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Basic route
app.get('/', (req, res) => {
    res.send('FleetFlow API is running...');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/rentals', rentalRecordRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

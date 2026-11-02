import dotenv from 'dotenv';
import prisma from './config/prisma.js';
import User from './models/User.js';
import Branch from './models/Branch.js';
import Vehicle from './models/Vehicle.js';
import Booking from './models/Booking.js';
import Payment from './models/Payment.js';
import Maintenance from './models/Maintenance.js';
import RentalRecord from './models/RentalRecord.js';
import Review from './models/Review.js';
import connectDB from './config/db.js';

dotenv.config();

const seedData = async () => {
    try {
        await connectDB();

        const force = process.argv.includes('--force');
        const existingUsers = await prisma.user.count();
        if (existingUsers > 0 && !force) {
            console.log('✅ PostgreSQL database already initialized. Skipping seed to preserve users and sessions.');
            process.exit(0);
        }

        console.log('Clearing existing data from PostgreSQL...');
        await Review.deleteMany();
        await RentalRecord.deleteMany();
        await Payment.deleteMany();
        await Booking.deleteMany();
        await Maintenance.deleteMany();
        await Vehicle.deleteMany();
        await Branch.deleteMany();
        await User.deleteMany();

        // 1. Create Admin & Manager & Customer Users
        console.log('Creating users...');
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@fleetflow.com',
            password: 'password123',
            role: 'admin',
            phone: '1234567890',
            isVerified: true,
        });

        const customerUser = await User.create({
            name: 'Demo Customer',
            email: 'customer@fleetflow.com',
            password: 'password123',
            role: 'customer',
            phone: '9876543210',
            isVerified: true,
        });

        // 2. Create Branches
        console.log('Creating branches...');
        const mainBranch = await Branch.create({
            name: 'Downtown Main Branch',
            location: {
                address: '123 Main St',
                city: 'Metropolis',
                state: 'NY',
                zipCode: '10001',
                coordinates: { lat: 40.7128, lng: -74.0060 }
            },
            managerId: adminUser._id,
            contactInfo: {
                phone: '123-456-7890',
                email: 'downtown@fleetflow.com'
            }
        });

        const airportBranch = await Branch.create({
            name: 'Airport Hub Branch',
            location: {
                address: 'Terminal 4, JFK Airport',
                city: 'Queens',
                state: 'NY',
                zipCode: '11430',
                coordinates: { lat: 40.6413, lng: -73.7781 }
            },
            managerId: adminUser._id,
            contactInfo: {
                phone: '123-555-7890',
                email: 'airport@fleetflow.com'
            }
        });

        const getImg = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

        // 3. Create Vehicles
        console.log('Creating vehicles...');
        const vehicles = [
            { brand: 'Tesla', model: 'Model 3', type: 'Car', category: 'Sedan', pricePerDay: 85, depositAmount: 500, fuelType: 'Electric', transmission: 'Automatic', seats: 5, mileage: 120, registrationNumber: 'EV-2024-01', branchId: mainBranch._id, images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'], features: ['Autopilot', 'Glass Roof', 'Electric'], status: 'Available' },
            { brand: 'Toyota', model: 'Camry', type: 'Car', category: 'Sedan', pricePerDay: 45, depositAmount: 200, fuelType: 'Petrol', transmission: 'Automatic', seats: 5, mileage: 16, registrationNumber: 'TC-2023-45', branchId: mainBranch._id, images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'], features: ['AC', 'Bluetooth', 'CarPlay'], status: 'Available' },
            { brand: 'Harley-Davidson', model: 'Iron 883', type: 'Bike', category: 'Cruiser', pricePerDay: 60, depositAmount: 300, fuelType: 'Petrol', transmission: 'Manual', seats: 2, mileage: 20, registrationNumber: 'HD-M-883', branchId: mainBranch._id, images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'], features: ['ABS', 'Exhaust'], status: 'Available' },
            { brand: 'Royal Enfield', model: 'Classic 350', type: 'Bike', category: 'Cruiser', pricePerDay: 30, depositAmount: 150, fuelType: 'Petrol', transmission: 'Manual', seats: 2, mileage: 35, registrationNumber: 'RE-C-350', branchId: mainBranch._id, images: ['https://images.unsplash.com/photo-1599819811279-d9b8f6281c72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'], features: ['Disc Brakes', 'Classic Style'], status: 'Available' },
            { brand: 'Honda', model: 'City', type: 'Car', category: 'Sedan', pricePerDay: 40, depositAmount: 150, fuelType: 'Petrol', transmission: 'Automatic', seats: 5, mileage: 18, registrationNumber: 'HN-101', branchId: mainBranch._id, images: [getImg('1553440569-1c9cd240974b')], features: ['AC', 'Bluetooth', 'Sunroof'], status: 'Available' },
            { brand: 'Hyundai', model: 'Creta', type: 'Car', category: 'SUV', pricePerDay: 50, depositAmount: 200, fuelType: 'Diesel', transmission: 'Manual', seats: 5, mileage: 19, registrationNumber: 'HY-102', branchId: airportBranch._id, images: [getImg('1568605117036-5fe5e7bab0b7')], features: ['AC', 'Spacious', 'Cruise Control'], status: 'Available' },
            { brand: 'Tata', model: 'Nexon', type: 'Car', category: 'SUV', pricePerDay: 45, depositAmount: 150, fuelType: 'Electric', transmission: 'Automatic', seats: 5, mileage: 110, registrationNumber: 'TA-103', branchId: airportBranch._id, images: [getImg('1492144534655-ae79c964c9d7')], features: ['AC', 'Electric', 'Fast Charge'], status: 'Available' },
            { brand: 'Mahindra', model: 'Thar', type: 'Car', category: 'SUV', pricePerDay: 60, depositAmount: 250, fuelType: 'Diesel', transmission: 'Manual', seats: 4, mileage: 14, registrationNumber: 'MH-104', branchId: mainBranch._id, images: [getImg('1533473359331-0135ef1b58bf')], features: ['4x4', 'Offroad', 'Removable Roof'], status: 'Available' },
            { brand: 'KTM', model: 'Duke 390', type: 'Bike', category: 'Premium', pricePerDay: 35, depositAmount: 150, fuelType: 'Petrol', transmission: 'Manual', seats: 2, mileage: 28, registrationNumber: 'KT-205', branchId: airportBranch._id, images: [getImg('1599813295822-0cc6323c6c11')], features: ['Street', 'TFT Display', 'Quickshifter'], status: 'Available' },
            { brand: 'Ather', model: '450X', type: 'Bike', category: 'Premium', pricePerDay: 18, depositAmount: 80, fuelType: 'Electric', transmission: 'Automatic', seats: 2, mileage: 90, registrationNumber: 'AT-206', branchId: mainBranch._id, images: [getImg('1625828859714-386d38e2d274')], features: ['Electric', 'Touchscreen Navigation'], status: 'Available' }
        ];

        await Vehicle.insertMany(vehicles);

        console.log('✅ PostgreSQL Database Seeded Successfully!');
        process.exit(0);
    } catch (error) {
        console.error(`❌ Seeding Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
};

seedData();

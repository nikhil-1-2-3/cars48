import { useEffect, useState } from 'react';
import useVehicleStore from '../store/vehicleStore';
import useBookingStore from '../store/bookingStore';
import useAuthStore from '../store/authStore';
import useReviewStore from '../store/reviewStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, ArrowLeft } from 'lucide-react';

const Vehicles = () => {
    const { vehicles, loading: vehiclesLoading, error, fetchVehicles } = useVehicleStore();
    const { createBooking, loading: bookingLoading } = useBookingStore();
    const { user } = useAuthStore();
    const { reviews, fetchVehicleReviews, loading: reviewsLoading, clearReviews } = useReviewStore();
    const navigate = useNavigate();

    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [detailsVehicle, setDetailsVehicle] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0); 
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [hoveredVehicleId, setHoveredVehicleId] = useState(null);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    useEffect(() => {
        if (detailsVehicle) {
            fetchVehicleReviews(detailsVehicle._id);
        } else {
            clearReviews();
        }
    }, [detailsVehicle, fetchVehicleReviews, clearReviews]);

    const handleBookClick = (vehicle) => {
        if (!user) {
            navigate('/login');
            return;
        }
        setSelectedVehicle(vehicle);
        setBookingSuccess(false);
        setStartDate('');
        setEndDate('');
    };

    const calculateTotal = () => {
        if (!startDate || !endDate || !selectedVehicle) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;
        
        const diffTime = Math.abs(end - start);
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); // calculate in hours
        
        if (diffHours < 24) {
            return diffHours * (selectedVehicle.pricePerHour || Math.round(selectedVehicle.pricePerDay / 12));
        } else {
            const days = Math.floor(diffHours / 24);
            const remainderHours = diffHours % 24;
            const extraHourRate = selectedVehicle.extraHourCharge || Math.round((selectedVehicle.pricePerDay / 12) * 1.5);
            return (days * selectedVehicle.pricePerDay) + (remainderHours * extraHourRate);
        }
    };

    const confirmBooking = async () => {
        if (!startDate || !endDate) return alert("Please select dates");
        const total = calculateTotal();
        
        const branchId = selectedVehicle.branchId?._id || selectedVehicle.branchId?.id || selectedVehicle.branchId;
        const vehicleId = selectedVehicle._id || selectedVehicle.id;

        const result = await createBooking({
            vehicleId,
            branchId,
            startDate,
            endDate,
            totalAmount: total,
            depositAmount: selectedVehicle.depositAmount
        });

        if (result && result.success) {
            const booking = result.data;
            try {
                const { data: { key } } = await api.get('/payments/key');
                const { data: order } = await api.post('/payments/order', {
                    amount: total,
                    bookingId: booking._id,
                    type: 'Booking'
                });

                // If running in Mock Mode or without real Razorpay keys, simulate successful test payment
                if (!window.Razorpay || key === 'mockedkey' || !key.startsWith('rzp_') || (order.id && order.id.startsWith('order_mock_'))) {
                    const simulated = window.confirm(
                        `💳 [Razorpay Test Sandbox]\n\nVehicle: ${selectedVehicle.brand} ${selectedVehicle.model}\nAmount: ₹${total}\n\nClick OK to simulate Successful Payment.`
                    );
                    if (simulated) {
                        await api.post('/payments/verify', {
                            razorpay_order_id: order.id,
                            razorpay_payment_id: `pay_mock_${Date.now()}`,
                            razorpay_signature: 'mock_signature'
                        });
                        
                        setBookingSuccess(true);
                        setTimeout(() => {
                            setSelectedVehicle(null);
                        }, 2000);
                    }
                    return;
                }

                const options = {
                    key: key, 
                    amount: order.amount,
                    currency: "INR",
                    name: "FleetFlow Black",
                    description: `Booking for ${selectedVehicle.brand} ${selectedVehicle.model}`,
                    order_id: order.id,
                    handler: async function (response) {
                        try {
                            await api.post('/payments/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });
                            
                            setBookingSuccess(true);
                            setTimeout(() => {
                                setSelectedVehicle(null);
                            }, 2000);
                        } catch (err) {
                            alert('Payment verification failed');
                        }
                    },
                    prefill: {
                        name: user.name,
                        email: user.email,
                        contact: user.phone
                    },
                    theme: {
                        color: "#09090b"
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response){
                    alert("Payment failed: " + response.error.description);
                });
                rzp.open();
            } catch (err) {
                alert("Failed to initiate payment. Please try again: " + (err.message || err));
            }
        } else {
            const errMsg = result?.error || 'Failed to create booking';
            alert(errMsg);
            if (errMsg.toLowerCase().includes('not authorized') || errMsg.toLowerCase().includes('log in') || errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('session')) {
                navigate('/login');
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 1,
                ease: [0.16, 1, 0.3, 1]
            }
        })
    };

    return (
        <div className="min-h-screen bg-zinc-950 px-6 py-24 relative overflow-hidden text-zinc-100 font-sans">
            
            <div className="max-w-[1400px] mx-auto relative z-10">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-900 pb-12 mb-20 gap-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-start"
                    >
                        <button 
                            onClick={() => navigate('/')} 
                            className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.2em] mb-12 group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                            Return to Base
                        </button>
                        
                        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter text-white mb-2">
                            The Fleet
                        </h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm md:text-base">
                            Select a vehicle to rent.
                        </p>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full md:w-96"
                    >
                        <input 
                            type="text" 
                            placeholder="INITIALIZE SEARCH..." 
                            className="w-full bg-zinc-900 border-none rounded-none text-white px-6 py-4 placeholder-zinc-600 focus:ring-2 focus:ring-white outline-none font-bold uppercase tracking-widest text-sm transition-all"
                            defaultValue=""
                            onChange={(e) => {
                                const val = e.target.value;
                                if (window.searchTimeout) clearTimeout(window.searchTimeout);
                                window.searchTimeout = setTimeout(() => {
                                    fetchVehicles(val);
                                }, 500);
                            }}
                        />
                    </motion.div>
                </div>

                {vehiclesLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-16 h-16 border-t-4 border-white animate-spin"></div>
                    </div>
                ) : vehicles.length === 0 ? (
                    <div className="text-center py-32 border border-zinc-900 bg-zinc-950/50">
                        <p className="text-zinc-600 font-bold uppercase tracking-[0.3em]">No vehicles available matching criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* Cars Section */}
                        {vehicles.filter(v => v.type === 'Car').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-zinc-400 mb-12 flex items-center gap-6">
                                    <span className="w-12 h-px bg-zinc-700"></span> Class: Four Wheel
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                                    {vehicles.filter(v => v.type === 'Car').map((vehicle, i) => (
                                        <motion.div 
                                            custom={i}
                                            initial="hidden"
                                            animate="visible"
                                            variants={cardVariants}
                                            key={vehicle._id} 
                                            onMouseEnter={() => setHoveredVehicleId(vehicle._id)}
                                            onMouseLeave={() => setHoveredVehicleId(null)}
                                            className={`group flex flex-col cursor-pointer transition-all duration-700 ${hoveredVehicleId && hoveredVehicleId !== vehicle._id ? 'opacity-30 grayscale blur-[2px]' : 'opacity-100 grayscale-0'}`}
                                            onClick={() => setDetailsVehicle(vehicle)}
                                        >
                                            <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden mb-6">
                                                {vehicle.images && vehicle.images.length > 0 ? (
                                                    <img src={vehicle.images[0]} alt={vehicle.model} className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-zinc-700 font-bold uppercase tracking-widest">No Visuals</div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60"></div>
                                                <div className="absolute top-4 left-4 bg-white text-zinc-950 px-3 py-1 font-bold uppercase tracking-widest text-xs">
                                                    {vehicle.brand}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-bold text-3xl uppercase tracking-tighter text-white">{vehicle.model}</h3>
                                                    <div className="text-xl font-medium text-white">
                                                        ₹{vehicle.pricePerDay}<span className="text-zinc-600 text-xs uppercase tracking-widest block text-right mt-1">/ day</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-8">
                                                    <span className="text-emerald-500 flex items-center gap-1">📍 {vehicle.branchId?.location?.city || 'HQ'}</span>
                                                    <span className="w-1 h-1 bg-zinc-700"></span>
                                                    <span>{vehicle.fuelType}</span>
                                                    <span className="w-1 h-1 bg-zinc-700"></span>
                                                    <span>{vehicle.transmission}</span>
                                                    {vehicle.averageRating > 0 && (
                                                        <>
                                                            <span className="w-1 h-1 bg-zinc-700"></span>
                                                            <span className="text-zinc-300">★ {vehicle.averageRating}</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-auto border-t border-zinc-900 pt-6 flex justify-between items-center">
                                                    <span className={`text-xs font-bold uppercase tracking-[0.2em] ${
                                                        vehicle.status === 'Available' ? 'text-white' : 'text-zinc-600'
                                                    }`}>
                                                        {vehicle.status}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleBookClick(vehicle); }} 
                                                        className="px-6 py-3 bg-zinc-900 group-hover:bg-white group-hover:text-zinc-950 text-white font-bold uppercase tracking-widest text-xs transition-colors duration-300 flex items-center gap-3"
                                                    >
                                                        Book <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bikes Section */}
                        {vehicles.filter(v => v.type === 'Bike').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-zinc-400 mb-12 flex items-center gap-6">
                                    <span className="w-12 h-px bg-zinc-700"></span> Class: Two Wheel
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                                    {vehicles.filter(v => v.type === 'Bike').map((vehicle, i) => (
                                        <motion.div 
                                            custom={i}
                                            initial="hidden"
                                            animate="visible"
                                            variants={cardVariants}
                                            key={vehicle._id} 
                                            onMouseEnter={() => setHoveredVehicleId(vehicle._id)}
                                            onMouseLeave={() => setHoveredVehicleId(null)}
                                            className={`group flex flex-col cursor-pointer transition-all duration-700 ${hoveredVehicleId && hoveredVehicleId !== vehicle._id ? 'opacity-30 grayscale blur-[2px]' : 'opacity-100 grayscale-0'}`}
                                            onClick={() => setDetailsVehicle(vehicle)}
                                        >
                                            <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden mb-6">
                                                {vehicle.images && vehicle.images.length > 0 ? (
                                                    <img src={vehicle.images[0]} alt={vehicle.model} className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-zinc-700 font-bold uppercase tracking-widest">No Visuals</div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60"></div>
                                                <div className="absolute top-4 left-4 bg-white text-zinc-950 px-3 py-1 font-bold uppercase tracking-widest text-xs">
                                                    {vehicle.brand}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-bold text-3xl uppercase tracking-tighter text-white">{vehicle.model}</h3>
                                                    <div className="text-xl font-medium text-white">
                                                        ₹{vehicle.pricePerDay}<span className="text-zinc-600 text-xs uppercase tracking-widest block text-right mt-1">/ day</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-8">
                                                    <span className="text-emerald-500 flex items-center gap-1">📍 {vehicle.branchId?.location?.city || 'HQ'}</span>
                                                    <span className="w-1 h-1 bg-zinc-700"></span>
                                                    <span>{vehicle.fuelType}</span>
                                                    <span className="w-1 h-1 bg-zinc-700"></span>
                                                    <span>{vehicle.transmission}</span>
                                                    {vehicle.averageRating > 0 && (
                                                        <>
                                                            <span className="w-1 h-1 bg-zinc-700"></span>
                                                            <span className="text-zinc-300">★ {vehicle.averageRating}</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-auto border-t border-zinc-900 pt-6 flex justify-between items-center">
                                                    <span className={`text-xs font-bold uppercase tracking-[0.2em] ${
                                                        vehicle.status === 'Available' ? 'text-white' : 'text-zinc-600'
                                                    }`}>
                                                        {vehicle.status}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleBookClick(vehicle); }} 
                                                        className="px-6 py-3 bg-zinc-900 group-hover:bg-white group-hover:text-zinc-950 text-white font-bold uppercase tracking-widest text-xs transition-colors duration-300 flex items-center gap-3"
                                                    >
                                                        Book <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- CINEMATIC SHOWROOM MODAL --- */}
            <AnimatePresence>
                {detailsVehicle && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 bg-zinc-950 z-50 overflow-y-auto flex flex-col"
                    >
                        {/* Massive Top Hero Image */}
                        <div className="relative w-full h-[60vh] bg-black shrink-0">
                            {detailsVehicle.images && detailsVehicle.images.length > 0 ? (
                                <motion.img 
                                    key={activeImageIndex}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    src={detailsVehicle.images[activeImageIndex] || detailsVehicle.images[0]} 
                                    alt={detailsVehicle.model} 
                                    className="w-full h-full object-cover opacity-60" 
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-800 font-bold uppercase tracking-[0.3em]">Classified Visuals</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                            
                            <button 
                                onClick={() => {
                                    setDetailsVehicle(null);
                                    setActiveImageIndex(0);
                                }} 
                                className="absolute top-8 right-8 text-white hover:text-zinc-400 bg-zinc-900/50 backdrop-blur-md p-4 transition-colors z-20 border border-zinc-800"
                            >
                                <X size={24} />
                            </button>

                            {/* Minimalist Thumbnails */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-20">
                                {detailsVehicle.images && detailsVehicle.images.map((imgUrl, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`h-1 transition-all duration-300 ${
                                            activeImageIndex === idx 
                                            ? 'bg-white w-12' 
                                            : 'bg-zinc-600 hover:bg-zinc-400 w-6'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* Showroom Specs */}
                        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 py-16 flex-1 flex flex-col md:flex-row gap-16 md:gap-24 relative -mt-32 z-10">
                            
                            <div className="md:w-1/2">
                                <div className="text-zinc-400 font-bold uppercase tracking-[0.3em] mb-4">
                                    {detailsVehicle.brand} // {detailsVehicle.type}
                                </div>
                                <h3 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter text-white mb-6">
                                    {detailsVehicle.model}
                                </h3>
                                
                                <div className="flex items-end gap-6 mb-8">
                                    <div className="text-4xl md:text-5xl font-bold text-white">₹{detailsVehicle.pricePerDay}</div>
                                    <div className="text-zinc-500 font-bold uppercase tracking-[0.2em] pb-1">INR / Daily Rate</div>
                                </div>
                                <div className="flex gap-8 mb-16">
                                    <div>
                                        <div className="text-xl font-bold text-white">₹{detailsVehicle.pricePerHour || Math.round(detailsVehicle.pricePerDay / 12)}</div>
                                        <div className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em]">Hourly Rate</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-red-500">+₹{detailsVehicle.extraHourCharge || Math.round((detailsVehicle.pricePerDay / 12) * 1.5)}</div>
                                        <div className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em]">Extra Hour</div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => {
                                        const v = detailsVehicle;
                                        setDetailsVehicle(null);
                                        setActiveImageIndex(0);
                                        handleBookClick(v);
                                    }} 
                                    className="w-full bg-white hover:bg-zinc-300 text-zinc-950 font-black uppercase tracking-[0.2em] py-6 text-xl transition-colors flex justify-center items-center gap-4 group"
                                >
                                    Book Now <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                            
                            <div className="md:w-1/2 border-l border-zinc-900 pl-0 md:pl-16">
                                <div className="text-white font-bold uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                                    <span className="w-8 h-[2px] bg-white"></span> Technical Specs
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-12 gap-x-8 mb-16">
                                    <div>
                                        <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-bold mb-2">Core Power</div>
                                        <div className="text-2xl font-bold text-white uppercase">{detailsVehicle.fuelType}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-bold mb-2">Drivetrain</div>
                                        <div className="text-2xl font-bold text-white uppercase">{detailsVehicle.transmission}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-bold mb-2">Capacity</div>
                                        <div className="text-2xl font-bold text-white uppercase">{detailsVehicle.seats || 4} Units</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-bold mb-2">Security Deposit</div>
                                        <div className="text-2xl font-bold text-white uppercase">₹{detailsVehicle.depositAmount}</div>
                                    </div>
                                </div>

                                {detailsVehicle.features && detailsVehicle.features.length > 0 && (
                                    <div className="border-t border-zinc-900 pt-12">
                                        <div className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-bold mb-6">Features</div>
                                        <div className="flex flex-wrap gap-4">
                                            {detailsVehicle.features.map((feature, idx) => (
                                                <span key={idx} className="text-zinc-400 font-bold uppercase tracking-widest text-sm border border-zinc-800 px-4 py-2">
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- CINEMATIC CLEARANCE (BOOKING) MODAL --- */}
            <AnimatePresence>
                {selectedVehicle && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6"
                    >
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-zinc-950 border border-zinc-800 max-w-lg w-full p-12 relative shadow-2xl"
                        >
                            {bookingSuccess ? (
                                <div className="text-center py-12">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-20 h-20 bg-white text-zinc-950 flex items-center justify-center mx-auto mb-8"
                                    >
                                        <ArrowRight size={32} />
                                    </motion.div>
                                    <h3 className="text-3xl font-bold uppercase tracking-tighter text-white mb-2">Authorization Complete</h3>
                                    <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-sm">Your vehicle is successfully booked.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-12 border-b border-zinc-900 pb-8">
                                        <div>
                                            <div className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs mb-2">Booking Details</div>
                                            <h3 className="text-4xl font-bold uppercase tracking-tighter text-white leading-none">
                                                {selectedVehicle.model}
                                            </h3>
                                        </div>
                                        <button onClick={() => setSelectedVehicle(null)} className="text-zinc-600 hover:text-white transition-colors bg-zinc-900 p-2">
                                            <X size={24} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Pickup Time</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full px-0 py-3 bg-transparent border-b border-zinc-700 text-white focus:border-white outline-none transition-colors font-bold uppercase tracking-widest text-sm" 
                                                    value={startDate} 
                                                    onChange={(e) => setStartDate(e.target.value)} 
                                                    min={new Date().toISOString().slice(0, 16)} 
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Return Time</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full px-0 py-3 bg-transparent border-b border-zinc-700 text-white focus:border-white outline-none transition-colors font-bold uppercase tracking-widest text-sm" 
                                                    value={endDate} 
                                                    onChange={(e) => setEndDate(e.target.value)} 
                                                    min={startDate || new Date().toISOString().slice(0, 16)} 
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="bg-zinc-900 p-8 space-y-4 text-sm mt-8">
                                            <div className="flex justify-between items-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                                                <span>Base Rate</span>
                                                <span className="text-white">₹{selectedVehicle.pricePerDay}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                                                <span>Security Deposit</span>
                                                <span className="text-white">₹{selectedVehicle.depositAmount}</span>
                                            </div>
                                            <div className="border-t border-zinc-800 pt-6 mt-4 flex justify-between items-center">
                                                <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">Total Price</span>
                                                <span className="font-bold text-3xl text-white">₹{calculateTotal()}</span>
                                            </div>
                                        </div>

                                        <div className="bg-red-950/30 border border-red-500/20 p-4 mt-6 flex items-start gap-3 rounded-lg">
                                            <div className="text-red-500 mt-0.5">!</div>
                                            <p className="text-red-400/80 text-xs uppercase tracking-wider font-bold leading-relaxed">
                                                MANDATORY REQUIREMENT:<br/>
                                                You must submit your original Aadhar Card and last month's electricity bill at the center for verification before vehicle handover.
                                            </p>
                                        </div>

                                        <div className="pt-8">
                                            <button 
                                                onClick={confirmBooking} 
                                                disabled={bookingLoading} 
                                                className="w-full py-6 bg-white hover:bg-zinc-300 text-zinc-950 font-black uppercase tracking-[0.2em] text-lg transition-colors flex justify-center items-center gap-4 disabled:opacity-50"
                                            >
                                                {bookingLoading ? 'Processing...' : 'Authorize Transaction'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Vehicles;

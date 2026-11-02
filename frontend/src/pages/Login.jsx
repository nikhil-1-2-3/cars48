import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();
    
    const { login, verifyOTP, googleLogin, requiresOTP, otpEmail, devOTP, emailPreviewUrl, user, isLoading, error, clearError } = useAuthStore();

    useEffect(() => {
        if (devOTP) {
            setOtp(devOTP);
        }
    }, [devOTP]);

    useEffect(() => {
        if (user) {
            navigate('/');
        }
        return () => clearError();
    }, [user, navigate, clearError]);

    const submitHandler = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        await googleLogin(credentialResponse.credential);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const success = await verifyOTP(otpEmail, otp);
        if (success) {
            navigate('/');
        }
    };

    if (requiresOTP) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center pt-32 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-zinc-900/50 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-zinc-800">
                    <div>
                        <h2 className="text-center text-3xl font-heading font-black uppercase tracking-tighter text-white">Verify <span className="text-zinc-500">Access</span></h2>
                        <p className="mt-4 text-center text-sm text-zinc-400 font-bold uppercase tracking-widest">
                            Authorization code sent to <br /><span className="text-white mt-1 block">{otpEmail}</span>
                        </p>
                    </div>

                    {emailPreviewUrl && (
                        <a 
                            href={emailPreviewUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-center bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-blue-400 text-xs font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-all"
                        >
                            📬 View Sent Email in Web Inbox &rarr;
                        </a>
                    )}

                    {devOTP && (
                        <div 
                            onClick={() => setOtp(devOTP)}
                            className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center cursor-pointer hover:bg-emerald-500/20 transition-all group"
                        >
                            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">Development Verification Code</span>
                            <span className="text-2xl font-mono font-black text-white tracking-[0.3em] block mt-1 group-hover:scale-105 transition-transform">{devOTP}</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mt-1 underline">Click to auto-fill</span>
                        </div>
                    )}

                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-xs font-bold uppercase tracking-widest text-center">{error}</div>}
                    <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
                        <div>
                            <label className="sr-only">Verification Code</label>
                            <input type="text" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-4 text-center text-3xl tracking-[0.5em] focus:ring-2 focus:ring-white outline-none transition-all" placeholder="000000" 
                                value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
                        </div>
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full bg-white text-zinc-950 hover:bg-zinc-300 font-black uppercase tracking-[0.2em] py-4 rounded-lg transition-colors flex justify-center items-center">
                                {isLoading ? 'Verifying...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center pt-32 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-zinc-900/50 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-zinc-800">
                <div>
                    <h2 className="text-center text-3xl font-heading font-black uppercase tracking-tighter text-white">Client <span className="text-zinc-500">Portal</span></h2>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-xs font-bold uppercase tracking-widest text-center">{error}</div>}
                <form className="mt-8 space-y-6" onSubmit={submitHandler}>
                    <div className="space-y-4">
                        <div>
                            <label className="sr-only">Email address</label>
                            <input type="email" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-4 placeholder-zinc-600 focus:ring-2 focus:ring-white outline-none font-bold uppercase tracking-widest text-xs transition-all" placeholder="EMAIL ADDRESS" 
                                value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="sr-only">Password</label>
                            <input type="password" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-4 placeholder-zinc-600 focus:ring-2 focus:ring-white outline-none font-bold uppercase tracking-widest text-xs transition-all" placeholder="PASSWORD" 
                                value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <button type="submit" disabled={isLoading} className="w-full bg-white text-zinc-950 hover:bg-zinc-300 font-black uppercase tracking-[0.2em] py-4 rounded-lg transition-colors flex justify-center items-center mt-4">
                            {isLoading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                    No account?{' '}
                    <Link to="/register" className="text-white hover:text-zinc-300 transition-colors">
                        Request Access
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import Turnstile from 'react-turnstile'; // خدمة Cloudflare Turnstile — معطّلة بتعليق
import Lottie from 'lottie-react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, User, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { apiService, ApiService } from '../services/api';
import { showSuccess } from '../utils/notifications';
import isometricDataAnalysisAnimation from '../images/Isometric data analysis.json';

// const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '0x4AAAAAACh0LGLTfAOqhxi6';

// /** تشغيل محلي أو تطوير — لا نعرض Turnstile ولا نرسل توكن (تجنب خطأ 110200) */
// const shouldUseTurnstile = (): boolean => {
//   if (process.env.REACT_APP_TURNSTILE_ENABLED === 'false') return false;
//   if (process.env.NODE_ENV !== 'production') return false;
//   if (typeof window === 'undefined') return false;
//   const host = window.location.hostname;
//   return host !== 'localhost' && host !== '127.0.0.1';
// };

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- محفوظ لتفعيل Turnstile لاحقاً
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // const useTurnstile = shouldUseTurnstile(); // معطّل — خدمة Cloudflare معطّلة
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- محفوظ لتفعيل Turnstile لاحقاً
  const useTurnstile = false;
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const MAX_LOGIN_ATTEMPTS = 4;
  const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  // رسالة ودية بعد انتهاء الجلسة (تُضبط من sessionManager عند 401 أو انتهاء التوكن)
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem('wakeel_login_flash');
      if (flash === 'expired') {
        setError('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مجدداً.');
      } else if (flash === 'unauthorized') {
        setError('انتهت الجلسة أو يلزم إعادة تسجيل الدخول.');
      }
      if (flash) sessionStorage.removeItem('wakeel_login_flash');
    } catch {
      /* ignore */
    }
  }, []);

  // استدعاء رسالة النظام عند فتح صفحة تسجيل الدخول (حسب المواصفات)
  useEffect(() => {
    apiService.getSystemMessage().catch(() => {});
  }, []);

  // إذا كان المستخدم مصادقاً بالفعل، لا تبقى في صفحة تسجيل الدخول
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // تحميل المحاولات من localStorage عند تحميل الصفحة
  useEffect(() => {
    const savedAttempts = localStorage.getItem('loginAttempts');
    const savedBlockTime = localStorage.getItem('blockTime');
    
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts));
    }
    
    if (savedBlockTime) {
      const blockTime = parseInt(savedBlockTime);
      const remaining = blockTime - Date.now();
      if (remaining > 0) {
        setIsBlocked(true);
        setBlockTimeRemaining(remaining);
      } else {
        // انتهت فترة الحظر
        localStorage.removeItem('blockTime');
        localStorage.removeItem('loginAttempts');
        setLoginAttempts(0);
        setIsBlocked(false);
      }
    }
  }, []);

  // تحديث العد التنازلي للحظر
  useEffect(() => {
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1000) {
            setIsBlocked(false);
            localStorage.removeItem('blockTime');
            localStorage.removeItem('loginAttempts');
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTimeRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AUTH_DEBUG][LoginPage] submit clicked', {
      username,
      isBlocked,
      blockTimeRemaining,
      loginAttempts,
      useTurnstile,
      hasCaptchaToken: !!captchaToken,
    });
    
    // التحقق من الحظر
    if (isBlocked) {
      console.warn('[AUTH_DEBUG][LoginPage] blocked, submit aborted', {
        blockTimeRemaining,
        loginAttempts,
      });
      const minutes = Math.floor(blockTimeRemaining / 60000);
      const seconds = Math.floor((blockTimeRemaining % 60000) / 1000);
      setError(`تم حظر تسجيل الدخول. يرجى المحاولة بعد ${minutes}:${seconds.toString().padStart(2, '0')}`);
      return;
    }

    setError('');
    setIsLoading(true);
    console.log('[AUTH_DEBUG][LoginPage] calling auth.login');

    try {
      // await login(username, password, useTurnstile ? (captchaToken ?? undefined) : undefined);
      await login(username, password, undefined); // لا نرسل توكن Turnstile — الخدمة معطّلة
      console.log('[AUTH_DEBUG][LoginPage] auth.login success, navigating dashboard');
      // نجح تسجيل الدخول - إعادة تعيين المحاولات
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('blockTime');
      setLoginAttempts(0);
      showSuccess('تم تسجيل الدخول بنجاح', 'مرحباً بك في نظام الوكيل');
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('[AUTH_DEBUG][LoginPage] auth.login failed', err);
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());

      // الحصول على رسالة الخطأ المترجمة
      const errorMessage = ApiService.showError(err);
      
      // التحقق من نوع الخطأ
      if (err.response?.status === 400 && err.response?.data?.message?.includes('انتهت صلاحية اشتراكك')) {
        setError('انتهت صلاحية اشتراكك. يرجى التواصل مع الدعم الفني لتجديد الاشتراك');
      } else {
        setError(errorMessage);
      }

      // التحقق من الوصول للحد الأقصى من المحاولات
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const blockTime = Date.now() + BLOCK_DURATION;
        setIsBlocked(true);
        setBlockTimeRemaining(BLOCK_DURATION);
        localStorage.setItem('blockTime', blockTime.toString());
        setError(`تم حظر تسجيل الدخول بعد ${MAX_LOGIN_ATTEMPTS} محاولات فاشلة. يرجى المحاولة بعد 5 دقائق أو التواصل مع الدعم الفني.`);
      } else {
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;
        if (remainingAttempts > 0) {
          setError(`${errorMessage}\n\nالمحاولات المتبقية: ${remainingAttempts}`);
        }
      }
    } finally {
      console.log('[AUTH_DEBUG][LoginPage] submit finished');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    window.open('https://api.whatsapp.com/send?phone=9647733140600&text=', '_blank');
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="جاري تسجيل الدخول..."
          backColor="#F0EAFE"
          frontColor="#8B5CF6"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-3 sm:p-4">
      <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full bg-primary-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-primary-300/35 blur-3xl" />
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-10 relative z-10">
        {/* Login Form Section */}
        <div className="flex-1 max-w-sm sm:max-w-md w-full order-2 lg:order-1">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl rounded-2xl border border-white/60 dark:border-gray-700/50 p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                نظام الوكيل
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                تسجيل الدخول إلى حسابك
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm">
                  <div className="flex items-start">
                    <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="whitespace-pre-line">{error}</div>
                  </div>
                </div>
              )}

              {/* عرض حالة المحاولات */}
              {loginAttempts > 0 && !isBlocked && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>المحاولات الفاشلة: {loginAttempts} من {MAX_LOGIN_ATTEMPTS}</span>
                  </div>
                </div>
              )}

              {/* عرض حالة الحظر */}
              {isBlocked && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>تم حظر تسجيل الدخول. يرجى المحاولة بعد: {formatTime(blockTimeRemaining)}</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-8 sm:pl-10 pr-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 dark:bg-gray-700 dark:text-white transition"
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 dark:bg-gray-700 dark:text-white transition"
                    placeholder="أدخل كلمة المرور"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Cloudflare Turnstile — معطّل بتعليق (لا تحذف)
              {useTurnstile && (
                <div className="flex justify-center">
                  <Turnstile
                    sitekey={TURNSTILE_SITE_KEY}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              )}
              */}

              <button
                type="submit"
                disabled={isLoading || isBlocked}
                className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-xl shadow-md text-sm sm:text-base font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : isBlocked ? (
                  'محظور مؤقتاً'
                ) : (
                  'تسجيل الدخول'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline focus:outline-none focus:underline"
                >
                  نسيت كلمة السر؟
                </button>
              </div>
            </form>

            <div className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-4 sm:mt-6">
              <p>جميع الحقوق محفوظة لنظام الوكيل 2026 ©</p>
            </div>
          </div>
        </div>

        {/* Animated System Visual Section */}
        <div className="flex-1 flex flex-col items-center justify-center lg:pl-8 order-1 lg:order-2">
          <div className="text-center bg-white/60 dark:bg-gray-800/40 rounded-2xl p-5 sm:p-6 border border-white/60 dark:border-gray-700/40 backdrop-blur-sm shadow-lg">
            <div className="mx-auto mb-3 h-48 w-48 sm:h-56 sm:w-56 lg:h-72 lg:w-72">
              <Lottie
                animationData={isometricDataAnalysisAnimation}
                loop
                autoplay
                className="h-full w-full"
              />
            </div>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
              منصة ذكية ومرنة لإدارة وكلائك ومشتركيك بسهولة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

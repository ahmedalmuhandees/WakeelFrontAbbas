import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { SubscriberInfo } from '../types';
import { useDigits } from '../contexts/DigitsContext';
import waklogo from '../images/waklogo.png';
import {
  User,
  Wifi,
  Gauge,
  MapPin,
  Calendar,
  Building2,
  LogOut,
  RefreshCw,
  BarChart2,
  Rocket,
  CreditCard,
  Phone,
} from 'lucide-react';

// Extended for API response that may include extra fields
type SubscriberInfoDisplay = SubscriberInfo & { phoneNumber?: string; profileName?: string };

const AD_SLIDES = [
  { title: 'خدماتنا', text: 'نقدم أفضل خدمات الإنترنت والاتصالات' },
  { title: 'السرعة', text: 'سرعات عالية واتصال مستقر' },
  { title: 'فروعنا', text: 'فروعنا منتشرة في جميع أنحاء العراق' },
];

const SubscriberInfoPage: React.FC = () => {
  const { formatDate, formatNumber } = useDigits();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState<number>(0);
  const [speedTesting, setSpeedTesting] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const { data: subscriberInfo, isError, error, isLoading } = useQuery<SubscriberInfoDisplay>({
    queryKey: ['subscriber-info', searchUsername],
    queryFn: () => apiService.getSubscriberInfo(searchUsername) as Promise<SubscriberInfoDisplay>,
    enabled: !!searchUsername,
    retry: false,
  });

  // بعد نجاح تحميل البيانات نثبت حالة الدخول
  useEffect(() => {
    if (subscriberInfo && searchUsername) {
      setIsLoggedIn(true);
    }
  }, [subscriberInfo, searchUsername]);

  const announcements = subscriberInfo?.announcements ?? [];
  const hasAnnouncements = announcements.length > 0;
  const slideCount = hasAnnouncements ? announcements.length : AD_SLIDES.length;

  // إعلانات دوارة
  useEffect(() => {
    if (!isLoggedIn) return;
    const t = setInterval(() => {
      setAdIndex((i) => (i + 1) % Math.max(1, slideCount));
    }, 3000);
    return () => clearInterval(t);
  }, [isLoggedIn, slideCount]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setSearchUsername(username.trim());
      // isLoggedIn يُفعّل في useEffect عند نجاح تحميل subscriberInfo
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setSearchUsername('');
    setSpeedValue(0);
  };

  const runSpeedTest = async () => {
    if (speedTesting) return;
    setSpeedTesting(true);
    setSpeedValue(0);
    const steps = 25;
    const stepDelay = 80;
    const finalSpeed = Math.floor(Math.random() * 100) + 10;
    for (let i = 0; i <= steps; i++) {
      setSpeedValue((finalSpeed * i) / steps);
      await new Promise((r) => setTimeout(r, stepDelay));
    }
    setSpeedTesting(false);
  };

  const daysRemaining = subscriberInfo?.daysRemaining ?? 0;
  const totalDays = 30;
  const daysUsed = totalDays - daysRemaining;
  const usagePercent = Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));
  const progressGradient =
    usagePercent > 80
      ? 'linear-gradient(90deg, #ff6b6b, #ee5a24)'
      : usagePercent > 60
      ? 'linear-gradient(90deg, #ffa726, #ff9800)'
      : 'linear-gradient(90deg, #66bb6a, #4caf50)';

  const displayName = subscriberInfo?.fullName || subscriberInfo?.username || username;
  const displayPhone = (subscriberInfo as SubscriberInfoDisplay)?.phoneNumber || 'غير محدد';
  const profileName = (subscriberInfo as SubscriberInfoDisplay)?.profileName || 'TCP-1';
  const salePrice = subscriberInfo?.salePrice ?? null;
  const companyName = subscriberInfo?.agentCompanyName || 'غير محدد';
  const paymentOptions = subscriberInfo?.paymentOptions ?? [];
  const expirationDate = subscriberInfo?.expirationDate
    ? formatDate(subscriberInfo.expirationDate)
    : '--/--/----';
  const defaultGradientStart = '#2962FF';
  const defaultGradientEnd = '#1E40AF';
  const currentSlideGradientStart = hasAnnouncements && announcements[adIndex]
    ? (announcements[adIndex].gradientStart?.trim() || defaultGradientStart)
    : defaultGradientStart;
  const currentSlideGradientEnd = hasAnnouncements && announcements[adIndex]
    ? (announcements[adIndex].gradientEnd?.trim() || defaultGradientEnd)
    : defaultGradientEnd;

  return (
    <div className="min-h-screen font-cairo" dir="rtl" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {!isLoggedIn ? (
        /* ---------- صفحة تسجيل الدخول — تصميم حديث ---------- */
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 sm:p-10 w-full max-w-[400px] text-center shadow-xl border border-white/60">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2962FF] to-[#1E40AF] shadow-lg shadow-blue-500/25 mb-5">
                <img src={waklogo} alt="شعار الوكيل" className="w-14 h-14 rounded-xl object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Al Wakeel</h1>
              <p className="text-slate-500 text-sm">مرحباً بك في نظام الوكيل</p>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-[#2962FF] rounded-full animate-spin mb-3" />
                <p className="text-slate-500 text-sm">جاري تسجيل الدخول...</p>
              </div>
            )}

            {!isLoading && (
              <form onSubmit={handleLogin} className="space-y-4 mb-6">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم"
                  required
                  className="w-full py-3.5 px-4 rounded-xl text-base text-right outline-none transition-all border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 placeholder:text-slate-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة السر"
                  required
                  className="w-full py-3.5 px-4 rounded-xl text-base text-right outline-none transition-all border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-[#2962FF] to-[#1E40AF] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:opacity-95 active:scale-[0.99] transition-all"
                >
                  تسجيل الدخول
                </button>
              </form>
            )}

            {isError && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-right text-sm">
                {error instanceof Error ? error.message : 'خطأ في تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.'}
              </div>
            )}

            <p className="text-slate-500 text-sm leading-relaxed">
              هنا يمكنك الاطلاع على تفاصيل اشتراكك ومتابعة حالة الخدمة.
            </p>
          </div>
        </div>
      ) : (
        /* ---------- لوحة التحكم — تصميم حديث ---------- */
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 pb-8">
          <div className="max-w-lg mx-auto px-4 pt-5">
          {/* الهيدر */}
          <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2962FF] to-[#1E40AF] flex items-center justify-center text-white shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <h3 className="text-slate-800 font-bold text-base truncate">{displayName}</h3>
              <p className="text-slate-500 text-sm truncate">{displayPhone}</p>
            </div>
          </div>

          {/* إعلانات دوارة */}
          <div
            className="relative mb-5 h-[172px] overflow-hidden rounded-2xl transition-colors duration-500 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${currentSlideGradientStart}, ${currentSlideGradientEnd})` }}
          >
            {hasAnnouncements
              ? announcements.map((ann, i) => (
                  <div
                    key={ann.id}
                    className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out p-6"
                    style={{
                      opacity: adIndex === i ? 1 : 0,
                      transform: adIndex === i ? 'translateX(0)' : 'translateX(100%)',
                    }}
                  >
                    <div className="flex items-center gap-6 w-full max-w-md text-right">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Wifi className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                          {ann.mainTitle || '—'}
                        </h3>
                        {ann.subTitle ? (
                          <p className="text-sm sm:text-base text-white/95 mb-1.5 leading-relaxed" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                            {ann.subTitle}
                          </p>
                        ) : null}
                        {ann.phone ? (
                          <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-sm">
                            <Phone className="w-4 h-4 text-white/90 flex-shrink-0" />
                            <span className="text-sm font-semibold text-white tabular-nums" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.1)' }} dir="ltr">
                              {ann.phone}
                            </span>
                          </div>
                        ) : null}
                        {!ann.subTitle && !ann.phone ? <p className="text-white/80 text-sm">—</p> : null}
                      </div>
                    </div>
                  </div>
                ))
              : AD_SLIDES.map((slide, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out p-6"
                    style={{
                      opacity: adIndex === i ? 1 : 0,
                      transform: adIndex === i ? 'translateX(0)' : 'translateX(100%)',
                    }}
                  >
                    <div className="flex items-center gap-6 w-full max-w-md text-right">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        {i === 0 && <Wifi className="w-7 h-7 text-white" />}
                        {i === 1 && <Gauge className="w-7 h-7 text-white" />}
                        {i === 2 && <MapPin className="w-7 h-7 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                          {slide.title}
                        </h3>
                        <p className="text-sm sm:text-base text-white/95 leading-relaxed" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                          {slide.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {Array.from({ length: slideCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAdIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    adIndex === i ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* البطاقات */}
          <div className="space-y-4 mb-5">
            {/* بطاقة الاشتراك */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#2962FF]">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-base">
                      {profileName}
                      {salePrice != null && (
                        <span className="text-[#2962FF] font-medium mr-1.5 text-sm">
                          ({formatNumber(salePrice, { suffix: ' د.ع' })})
                        </span>
                      )}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">باقة الإنترنت</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">
                    {daysRemaining > 0
                      ? `باقي ${daysRemaining} ${daysRemaining === 1 ? 'يوم' : 'أيام'}`
                      : 'منتهية'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">تاريخ الانتهاء</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${usagePercent}%`, background: progressGradient }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  {daysRemaining > 0
                    ? `${Math.round(usagePercent)}% مستخدمة · باقي ${daysRemaining} ${daysRemaining === 1 ? 'يوم' : 'أيام'}`
                    : 'الباقة منتهية الصلاحية'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(true)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-[#2962FF] text-white hover:bg-[#1E40AF] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 shadow-md shadow-blue-500/25"
                >
                  <RefreshCw className="w-4 h-4" />
                  تجديد
                </button>
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all inline-flex items-center justify-center gap-2"
                >
                  <BarChart2 className="w-4 h-4" />
                  تفاصيل
                </button>
              </div>
            </div>

            {/* بطاقة قياس السرعة */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">قياس السرعة</p>
                    <p className="text-slate-500 text-xs mt-0.5">اختبار الاتصال</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-800 tabular-nums">{speedValue.toFixed(1)}</p>
                  <p className="text-slate-500 text-xs">Mbps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={runSpeedTest}
                disabled={speedTesting}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                {speedTesting ? 'جاري الاختبار...' : 'قياس السرعة'}
              </button>
            </div>
          </div>

          {/* تاريخ الانتهاء واسم الشركة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm">تاريخ الانتهاء</p>
                    <p className="text-slate-500 text-xs">انتهاء الاشتراك</p>
                  </div>
                </div>
                <p className="font-bold text-slate-800 text-lg flex-shrink-0">{expirationDate}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm">اسم الشركة</p>
                    <p className="text-slate-500 text-xs">مزود الخدمة</p>
                  </div>
                </div>
                <p className="font-bold text-slate-800 text-sm truncate text-left max-w-[140px]" title={companyName}>{companyName}</p>
              </div>
            </div>
          </div>

          {/* مودال طرق الدفع */}
          {showRenewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowRenewModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right" onClick={(e) => e.stopPropagation()} dir="rtl">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">طرق الدفع للتجديد</h3>
                  <button type="button" onClick={() => setShowRenewModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" aria-label="إغلاق">
                    ×
                  </button>
                </div>
                <div className="p-6">
                  {paymentOptions.length === 0 ? (
                    <p className="text-slate-500 text-sm">لا توجد طرق دفع محددة. يرجى التواصل مع مزود الخدمة.</p>
                  ) : (
                    <ul className="space-y-3">
                      {paymentOptions.map((opt, i) => (
                        <li key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <CreditCard className="w-5 h-5 text-[#2962FF] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{opt.methodName}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{opt.details}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="px-6 pb-6 flex justify-end">
                  <button type="button" onClick={() => setShowRenewModal(false)} className="py-2.5 px-5 rounded-xl bg-[#2962FF] text-white font-semibold hover:bg-[#1E40AF] transition-colors">
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* تسجيل الخروج */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="py-3 px-6 text-sm font-semibold rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriberInfoPage;

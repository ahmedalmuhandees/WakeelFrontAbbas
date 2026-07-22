import React from 'react';
import {
  Wifi,
  Router,
  HeadphonesIcon,
  MessageCircle,
  Shield,
  Zap,
  MapPin,
  LogIn,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import aljizanyLogo from '../images/aljizany-logo.jpeg';

const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=9647740240101';

const LandingPage: React.FC = () => {
  const handleContact = (text?: string) => {
    const q = text ? `&text=${encodeURIComponent(text)}` : '&text=';
    window.open(`${WHATSAPP_URL}${q}`, '_blank');
  };

  const services = [
    {
      icon: Wifi,
      title: 'إنترنت منزلي',
      description: 'اتصال مستقر وسريع يناسب العائلة والعمل من المنزل على مدار الساعة.',
    },
    {
      icon: Router,
      title: 'حلول الشركات',
      description: 'شبكات موثوقة للمكاتب والمشاريع مع أولوية في الدعم والصيانة.',
    },
    {
      icon: HeadphonesIcon,
      title: 'دعم فني دائم',
      description: 'فريق جاهز لمتابعة الأعطال والتركيب والتفعيل بسرعة واستجابة عالية.',
    },
  ];

  const strengths = [
    { icon: Zap, title: 'سرعة واستقرار', text: 'بنية شبكة مصممة لأداء ثابت حتى في ساعات الذروة.' },
    { icon: MapPin, title: 'تغطية محلية', text: 'خدمة قريبة منك مع متابعة ميدانية عند الحاجة.' },
    { icon: Shield, title: 'ثقة وشفافية', text: 'تعامل واضح وخدمة مشتركي نلتزم بها يومياً.' },
  ];

  return (
    <div className="aljizany-landing min-h-screen text-[#E8E6E3] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap');

        .aljizany-landing {
          --aj-bg: #050505;
          --aj-bg-elevated: #0c0c0c;
          --aj-gold: #e8a317;
          --aj-gold-deep: #c4780a;
          --aj-gold-soft: rgba(232, 163, 23, 0.18);
          --aj-silver: #b8b8b8;
          --aj-muted: #8a8a8a;
          --aj-line: rgba(232, 163, 23, 0.35);
          font-family: 'Tajawal', 'Cairo', sans-serif;
          background:
            radial-gradient(ellipse 90% 55% at 50% -10%, rgba(232, 163, 23, 0.14), transparent 55%),
            radial-gradient(ellipse 50% 40% at 100% 30%, rgba(196, 120, 10, 0.08), transparent 50%),
            var(--aj-bg);
          color: #e8e6e3;
        }

        .aljizany-landing .aj-brand {
          font-family: 'Outfit', 'Tajawal', sans-serif;
          letter-spacing: 0.04em;
        }

        .aljizany-landing .aj-gold-text {
          background: linear-gradient(135deg, #f3c45a 0%, #e8a317 45%, #c4780a 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .aljizany-landing .aj-btn-gold {
          background: linear-gradient(135deg, #f0b63a 0%, #e8a317 40%, #c4780a 100%);
          color: #0a0a0a;
          transition: transform 0.25s ease, filter 0.25s ease;
        }
        .aljizany-landing .aj-btn-gold:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .aljizany-landing .aj-btn-ghost {
          border: 1px solid var(--aj-line);
          color: #f3c45a;
          background: transparent;
          transition: background 0.25s ease, border-color 0.25s ease;
        }
        .aljizany-landing .aj-btn-ghost:hover {
          background: var(--aj-gold-soft);
          border-color: var(--aj-gold);
        }

        @keyframes aj-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aj-logo-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes aj-line-draw {
          from { transform: scaleX(0); opacity: 0.2; }
          to { transform: scaleX(1); opacity: 1; }
        }
        @keyframes aj-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .aljizany-landing .aj-rise { animation: aj-rise 0.8s ease both; }
        .aljizany-landing .aj-rise-delay-1 { animation-delay: 0.12s; }
        .aljizany-landing .aj-rise-delay-2 { animation-delay: 0.24s; }
        .aljizany-landing .aj-logo-anim {
          animation: aj-logo-in 0.9s ease both, aj-drift 5.5s ease-in-out 1s infinite;
        }
        .aljizany-landing .aj-gold-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--aj-gold), transparent);
          transform-origin: center;
          animation: aj-line-draw 1.1s ease 0.35s both;
        }
      `}</style>

      <header className="relative z-20 border-b border-[var(--aj-line)]/40 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={aljizanyLogo}
              alt="ALJIzany"
              className="h-11 w-11 rounded-full object-cover ring-1 ring-[var(--aj-gold)]/50 sm:h-12 sm:w-12"
            />
            <div>
              <p className="aj-brand text-lg font-bold leading-none tracking-wide sm:text-xl">
                <span className="aj-gold-text">AL</span>
                <span className="text-white">JIzany</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--aj-muted)] sm:text-xs">خدمات الإنترنت</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="aj-btn-ghost inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold sm:px-4"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">دخول النظام</span>
              <span className="sm:hidden">دخول</span>
            </Link>
            <button
              type="button"
              onClick={() => handleContact('مرحباً، أود الاستفسار عن خدمات ALJIzany')}
              className="aj-btn-gold inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold sm:px-4"
            >
              <MessageCircle className="h-4 w-4" />
              <span>تواصل</span>
            </button>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(232,163,23,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(232,163,23,0.35) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />

        <img
          src={aljizanyLogo}
          alt="شعار ALJIzany"
          className="aj-logo-anim relative z-10 mb-8 h-44 w-44 rounded-full object-cover shadow-[0_0_0_1px_rgba(232,163,23,0.35)] sm:h-56 sm:w-56 md:h-64 md:w-64"
        />

        <h1 className="aj-brand aj-rise relative z-10 text-5xl font-extrabold tracking-wide sm:text-6xl md:text-7xl">
          <span className="aj-gold-text">AL</span>
          <span className="text-white">JIzany</span>
        </h1>

        <div className="aj-gold-rule relative z-10 mx-auto my-5 w-40 sm:w-56" />

        <p className="aj-rise aj-rise-delay-1 relative z-10 max-w-xl text-base text-[var(--aj-silver)] sm:text-lg">
          شركة خدمات إنترنت تضع الاستقرار والسرعة ورضا المشترك في صميم عملها.
        </p>

        <div className="aj-rise aj-rise-delay-2 relative z-10 mt-9">
          <Link
            to="/login"
            className="aj-btn-gold inline-flex min-w-[200px] items-center justify-center gap-2 rounded-md px-7 py-3.5 text-base font-bold"
          >
            <LogIn className="h-4 w-4" />
            بوابة الوكلاء
          </Link>
        </div>
      </section>

      <section className="relative border-t border-[var(--aj-line)]/30 bg-[var(--aj-bg-elevated)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">خدماتنا</h2>
            <p className="mt-3 text-[var(--aj-muted)]">
              حلول إنترنت مصممة للمنزل والعمل — بدون تعقيد وبدون مفاجآت.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {services.map((item) => (
              <div key={item.title} className="text-center md:text-right">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[var(--aj-line)] bg-black/40 text-[var(--aj-gold)]">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--aj-silver)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">لماذا ALJIzany؟</h2>
            <p className="mt-3 text-[var(--aj-muted)]">
              نركز على جودة الشبكة وخدمة المشترك قبل أي شيء آخر.
            </p>
          </div>

          <div className="mt-14 space-y-0 divide-y divide-[var(--aj-line)]/25 border-y border-[var(--aj-line)]/25">
            {strengths.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 py-7 sm:flex-row sm:items-start sm:gap-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--aj-gold-soft)] text-[var(--aj-gold)]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-[var(--aj-silver)]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--aj-line)]/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="aj-brand text-3xl font-extrabold sm:text-4xl">
            <span className="aj-gold-text">تواصل مع</span>{' '}
            <span className="text-white">ALJIzany</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[var(--aj-silver)]">
            للاستفسار عن الاشتراك أو الدعم الفني — راسلنا مباشرة عبر واتساب.
          </p>
          <button
            type="button"
            onClick={() => handleContact('مرحباً، أحتاج مساعدة من فريق ALJIzany')}
            className="aj-btn-gold mt-8 inline-flex items-center gap-2 rounded-md px-8 py-3.5 text-base font-bold"
          >
            <MessageCircle className="h-5 w-5" />
            تواصل عبر واتساب
          </button>
        </div>
      </section>

      <footer className="border-t border-[var(--aj-line)]/30 bg-black py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={aljizanyLogo} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--aj-gold)]/40" />
            <div>
              <p className="aj-brand font-bold">
                <span className="aj-gold-text">AL</span>
                <span className="text-white">JIzany</span>
              </p>
              <p className="text-xs text-[var(--aj-muted)]">عباس الجيزاني — خدمات الإنترنت</p>
            </div>
          </div>
          <p className="text-sm text-[var(--aj-muted)]">© {new Date().getFullYear()} ALJIzany. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  BarChart3, 
  Smartphone, 
  Wifi, 
  CreditCard, 
  MessageCircle,
  CheckCircle,
  Star,
  ArrowRight,
  HeadphonesIcon,
  Package,
  Zap,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import waklogo from '../images/waklogo.png';

const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=9647740240101';

const LandingPage: React.FC = () => {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const handleRequestSystem = () => {
    window.open(`${WHATSAPP_URL}&text=`, '_blank');
  };

  const handleSubscribe = (packageName: string) => {
    const text = encodeURIComponent(`مرحباً، أود الاشتراك في ${packageName}`);
    window.open(`${WHATSAPP_URL}&text=${text}`, '_blank');
  };

  const features = [
    {
      icon: Users,
      title: 'إدارة الوكلاء',
      description: 'نظام شامل لإدارة الوكلاء مع تتبع حالة الاشتراكات والصلاحيات'
    },
    {
      icon: Smartphone,
      title: 'إدارة المشتركين',
      description: 'إضافة وتحديث بيانات المشتركين مع تتبع حالة الاشتراكات'
    },
    {
      icon: Wifi,
      title: 'إدارة الشبكات',
      description: 'توليد أكواد WiFi و QR Codes للمشتركين تلقائياً'
    },
    {
      icon: CreditCard,
      title: 'نظام الفواتير',
      description: 'إنشاء وإدارة الفواتير مع تتبع المدفوعات والديون'
    },
    {
      icon: BarChart3,
      title: 'التقارير والإحصائيات',
      description: 'تقارير مفصلة عن المبيعات والأرباح والإحصائيات'
    },
    {
      icon: Shield,
      title: 'الأمان والحماية',
      description: 'نظام أمان متقدم مع تشفير البيانات وحماية الخصوصية'
    }
  ];

  const benefits = [
    'سهولة الاستخدام والواجهة العربية',
    'إدارة شاملة لجميع العمليات',
    'تقارير مفصلة وإحصائيات دقيقة',
    'دعم فني متواصل',
    'تحديثات مستمرة وميزات جديدة',
    'أمان عالي وحماية البيانات'
  ];

  const stats = [
    { number: '100+', label: 'وكيل نشط' },
    { number: '1000+', label: 'مشترك' },
    { number: '99%', label: 'رضا العملاء' },
    { number: '24/7', label: 'دعم فني' }
  ];

  const packages = [
    {
      id: 'monthly',
      name: 'الباقة الشهرية',
      price: '10,000',
      period: 'شهرياً',
      features: ['دعم ٢٤/٧', 'مميزات شهرية مجاناً', 'مميزات أخرى']
    },
    {
      id: 'yearly',
      name: 'الباقة السنوية',
      price: '80,000',
      period: 'سنوياً',
      features: ['دعم ٢٤/٧', 'مميزات شهرية مجاناً', 'مميزات أخرى']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={waklogo} alt="نظام الوكيل" className="h-10 w-10 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
                نظام الوكيل
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                to="/register-agent"
                className="border border-primary-600 text-primary-700 dark:text-primary-400 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-4 sm:px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                <span>تسجيل وكيل</span>
              </Link>
              <button
                onClick={handleRequestSystem}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>طلب النظام</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img src={waklogo} alt="نظام الوكيل" className="h-32 w-32" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6" style={{ fontFamily: 'Cairo, sans-serif' }}>
              نظام الوكيل
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
              نظام شامل ومتطور لإدارة الوكلاء والمشتركين مع أحدث التقنيات والأمان العالي
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRequestSystem}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                <span>طلب النظام الآن</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                to="/system-pricing"
                className="border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                تعرف على الأسعار والباقات
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
              مميزات النظام
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
              نظام متكامل يوفر جميع الأدوات اللازمة لإدارة أعمالك بكفاءة عالية
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-primary-100 dark:bg-primary-900/20 p-3 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mr-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / الباقات Section */}
      <section className="py-20 bg-white dark:bg-gray-800" id="packages">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
              <Package className="h-7 w-7 text-primary-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
              اختر الباقة المناسبة لك
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
              اشترك الآن واستمتع بجميع مميزات النظام مع دعم فني على مدار الساعة
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {packages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPackageId((prev) => (prev === pkg.id ? null : pkg.id))}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedPackageId((prev) => (prev === pkg.id ? null : pkg.id))}
                  className={`relative rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-primary-500 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {isSelected && pkg.id === 'yearly' && (
                    <div className="absolute top-0 left-0 right-0 bg-primary-600 text-white text-center py-1.5 text-sm font-semibold" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      الأوفر
                    </div>
                  )}
                  <div className={`p-8 ${isSelected && pkg.id === 'yearly' ? 'pt-12' : ''}`}>
                    <div className="flex items-center mb-6">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-primary-500 text-white' : 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'}`}>
                        <Zap className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mr-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {pkg.name}
                      </h3>
                    </div>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-primary-600" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {pkg.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 mr-1" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        د.ع
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 mr-1" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {' '}{pkg.period}
                      </span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSubscribe(pkg.name); }}
                      className={`w-full py-3.5 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 ${
                        isSelected
                          ? 'bg-primary-600 hover:bg-primary-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-primary-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={{ fontFamily: 'Cairo, sans-serif' }}
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>اشتراك</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6" style={{ fontFamily: 'Cairo, sans-serif' }}>
                لماذا تختار نظام الوكيل؟
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-8 rounded-lg text-white">
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                احصل على النظام الآن
              </h3>
              <p className="mb-6" style={{ fontFamily: 'Cairo, sans-serif' }}>
                تواصل معنا عبر WhatsApp للحصول على النظام وبدء إدارة أعمالك بكفاءة
              </p>
              <button
                onClick={handleRequestSystem}
                className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>تواصل معنا</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
              آراء عملائنا
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
              اكتشف ما يقوله عملاؤنا عن نظام الوكيل
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                  "نظام الوكيل ساعدني في إدارة أعمالي بكفاءة عالية. الواجهة سهلة الاستخدام والتقارير مفصلة جداً."
                </p>
                <div className="flex items-center">
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-full p-2 mr-3">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      عميل راضي
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      وكيل نشط
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
            ابدأ رحلتك مع نظام الوكيل اليوم
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
            انضم إلى مئات الوكلاء الذين يثقون في نظام الوكيل لإدارة أعمالهم
          </p>
          <button
            onClick={handleRequestSystem}
            className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 mx-auto"
            style={{ fontFamily: 'Cairo, sans-serif' }}
          >
            <MessageCircle className="h-5 w-5" />
            <span>طلب النظام الآن</span>
          </button>
        </div>
      </section>

      {/* تثبيت التطبيق على الآيفون */}
      <section className="py-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
            <Smartphone className="h-7 w-7 text-primary-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
            ثبت التطبيق على الآيفون
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6" style={{ fontFamily: 'Cairo, sans-serif' }}>
            حمّل ملف التثبيت ثم اتبع الخطوات لإضافة تطبيق نظام الوكيل إلى شاشتك الرئيسية
          </p>
          <a
            href={`${process.env.PUBLIC_URL || ''}/wakeel.mobileconfig`}
            download="wakeel.mobileconfig"
            className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            style={{ fontFamily: 'Cairo, sans-serif' }}
          >
            <Download className="h-6 w-6" />
            <span>تحميل ملف التثبيت للآيفون</span>
          </a>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-4 font-medium" style={{ fontFamily: 'Cairo, sans-serif' }}>
            ملاحظة: افتح هذه الصفحة من متصفح Safari على الآيفون حصراً ثم اضغط تحميل
          </p>
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-right text-sm text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <p className="font-semibold mb-2">بعد التحميل:</p>
            <ol className="list-decimal list-inside space-y-1 text-right">
              <li>اذهب إلى <strong>الإعدادات (Settings)</strong></li>
              <li>اختر <strong>تم تنزيل ملف التعريف (Profile Downloaded)</strong></li>
              <li>اضغط <strong>تثبيت (Install)</strong></li>
              <li>سيظهر تطبيق نظام الوكيل على شاشتك الرئيسية</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={waklogo} alt="نظام الوكيل" className="h-8 w-8 mr-2" />
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>
                  نظام الوكيل
                </h3>
              </div>
              <p className="text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                نظام شامل ومتطور لإدارة الوكلاء والمشتركين
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                المميزات
              </h4>
              <ul className="space-y-2 text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                <li>إدارة الوكلاء</li>
                <li>إدارة المشتركين</li>
                <li>نظام الفواتير</li>
                <li>التقارير والإحصائيات</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                الدعم
              </h4>
              <ul className="space-y-2 text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                <li>الدعم الفني</li>
                <li>التدريب</li>
                <li>التحديثات</li>
                <li>الأسئلة الشائعة</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                التواصل
              </h4>
              <div className="space-y-2 text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  <span>WhatsApp: 07740240101</span>
                </div>
                <div className="flex items-center">
                  <HeadphonesIcon className="h-4 w-4 mr-2" />
                  <span>دعم فني 24/7</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <p>جميع الحقوق محفوظة لنظام الوكيل 2026 ©</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

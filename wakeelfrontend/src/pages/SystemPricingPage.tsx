import React from 'react';
import { CheckCircle, Crown, Gem, Package, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import waklogo from '../images/waklogo.png';

const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=9647740240101';

type PricingPlan = {
  id: string;
  title: string;
  price: string;
  period: string;
  subtitle: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    id: 'economic',
    title: 'الباقة الاقتصادية',
    price: '10,000',
    period: 'شهرياً',
    subtitle: 'مناسبة للوكلاء المبتدئين أو أصحاب العمل الصغير.',
    icon: Package,
    features: [
      'ريسيلر عدد 1',
      'إدارة المشتركين',
      'إدارة التفعيلات',
      'إدارة الديون',
      'إدارة الحسابات',
      'إدارة الفواتير',
      'إدارة الموظفين',
      'إدارة رواتب الموظفين',
      'ربط الواتساب',
      'إعدادات قوالب الواتساب',
      'تطبيق للوكيل',
      'تطبيق للمشترك',
    ],
  },
  {
    id: 'plus',
    title: 'باقة Plus',
    price: '15,000',
    period: 'شهرياً',
    subtitle: 'مناسبة للوكلاء الذين يحتاجون إدارة أوسع وتنظيم أكبر للعمل والموظفين.',
    badge: 'الأكثر مبيعاً',
    icon: Crown,
    features: [
      'ريسيلر عدد 3',
      'إدارة المشتركين',
      'إدارة التفعيلات',
      'إدارة الديون',
      'إدارة الحسابات',
      'إدارة الفواتير',
      'إدارة الموظفين',
      'إدارة رواتب الموظفين',
      'ربط الواتساب',
      'إعدادات قوالب الواتساب',
      'إدارة المصاريف',
      'إدارة مهام الموظفين',
      'تكتات الصيانة - التنصيب - استلام المبالغ - أخرى',
      'أنواع مهام الموظفين',
      'موظف فني - موظف مندوب اشتراكات - موظف دعم فني / Call Center',
      'تطبيق للوكيل',
      'تطبيق للمشترك',
    ],
  },
  {
    id: 'vip',
    title: 'باقة VIP',
    price: '30,000',
    period: 'شهرياً',
    subtitle: 'مناسبة للوكلاء الكبار أو من يحتاجون جميع أدوات الإدارة والمحاسبة المتقدمة.',
    icon: Gem,
    features: [
      'ريسيلر عدد 6',
      'إدارة المشتركين',
      'إدارة التفعيلات',
      'إدارة الديون',
      'إدارة الحسابات',
      'إدارة الفواتير',
      'إدارة الموظفين',
      'إدارة رواتب الموظفين',
      'ربط الواتساب',
      'إعدادات قوالب الواتساب',
      'إدارة المصاريف',
      'إدارة مهام الموظفين',
      'تكتات الصيانة - التنصيب - استلام المبالغ - أخرى',
      'أنواع مهام الموظفين',
      'موظف فني - موظف مندوب اشتراكات - موظف دعم فني / Call Center',
      'حساب الكاش باك',
      'فواتير الوكلاء وإدارة الأرصدة',
      'تطبيق للوكيل',
      'تطبيق للمشترك',
    ],
  },
  {
    id: 'custom',
    title: 'الباقة المخصصة',
    price: '500,000',
    period: 'دفعة واحدة',
    subtitle: 'مناسبة للوكلاء أو الشركات التي ترغب بنظام خاص حسب احتياجها.',
    icon: Package,
    features: [
      'اختيار المميزات والإعدادات حسب طلب الوكيل',
      'إمكانية تخصيص النظام بالكامل حسب طبيعة العمل',
      'دعم فني',
      'صيانة مجانية',
      'بعد السنة الأولى يتم دفع 100,000 دينار سنوياً كرسوم للسيرفر والاستضافة',
    ],
  },
];

const SystemPricingPage: React.FC = () => {
  const goWhatsApp = (planTitle: string) => {
    const text = encodeURIComponent(`مرحباً، أود الاشتراك في ${planTitle}`);
    window.open(`${WHATSAPP_URL}&text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={waklogo} alt="نظام الوكيل" className="h-10 w-10 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
                أسعار نظام الوكيل
              </h1>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 border border-primary-600 text-primary-700 dark:text-primary-400 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-4 py-2 rounded-lg transition-colors"
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              <ArrowRight className="h-4 w-4" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
              باقات نظام الوكيل
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
              يوفّر نظام الوكيل عدة باقات تناسب حجم عملك واحتياجك، بحيث تختار الباقة المناسبة وتبدأ بإدارة شغلك بشكل منظم واحترافي.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl bg-white dark:bg-gray-800 border shadow-xl p-6 sm:p-8 ${
                    plan.badge
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 left-0 right-0 bg-primary-600 text-white text-center py-1.5 text-sm font-semibold rounded-t-2xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      {plan.badge}
                    </div>
                  )}

                  <div className={plan.badge ? 'pt-5' : ''}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {plan.title}
                      </h3>
                    </div>

                    <div className="mb-3">
                      <span className="text-4xl font-bold text-primary-600" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 mr-1" style={{ fontFamily: 'Cairo, sans-serif' }}> دينار </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        {plan.period}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-5" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      {plan.subtitle}
                    </p>

                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        تشمل:
                      </h4>
                      <ul className="space-y-2 max-h-72 overflow-auto pr-1">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => goWhatsApp(plan.title)}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold transition-colors inline-flex items-center justify-center gap-2"
                      style={{ fontFamily: 'Cairo, sans-serif' }}
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>اشترك الآن</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
              ملاحظة مهمة
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
              جميع الباقات تعمل بنظام سحابي (Cloud System) ومتوفرة على:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1" style={{ fontFamily: 'Cairo, sans-serif' }}>
              <li>الحاسبة</li>
              <li>الأندرويد</li>
              <li>الآيفون</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
              مع رابط موحد يعمل على جميع الأجهزة.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SystemPricingPage;

export const translations = {
  ar: {
    // Home
    home_title: 'BuildPro - منصة التسعير',
    home_subtitle: 'مرحباً بك في BuildPro',
    home_login: 'تسجيل الدخول',
    home_signup: 'إنشاء حساب جديد',
    
    // Login
    login_title: 'تسجيل الدخول',
    login_email: 'البريد الإلكتروني',
    login_password: 'كلمة المرور',
    login_button: 'دخول',
    login_no_account: 'ليس لديك حساب؟',
    login_create: 'إنشاء حساب',
    login_success: 'تم تسجيل الدخول بنجاح!',
    login_wrong_password: 'كلمة المرور غير صحيحة!',
    login_email_not_found: 'البريد الإلكتروني غير موجود!',
    
    // Signup
    signup_title: 'إنشاء حساب جديد',
    signup_name: 'الاسم',
    signup_email: 'البريد الإلكتروني',
    signup_password: 'كلمة المرور',
    signup_type: 'نوع الحساب',
    signup_contractor: 'مقاول',
    signup_supplier: 'مورد',
    signup_button: 'تسجيل',
    signup_have_account: 'هل لديك حساب بالفعل؟',
    signup_login: 'دخول',
    signup_success: 'تم التسجيل بنجاح!',
    
    // Dashboard
    dashboard_title: 'لوحة التحكم',
    dashboard_logout: 'تسجيل الخروج',
    dashboard_welcome: 'مرحباً',
    dashboard_email: 'البريد الإلكتروني',
    dashboard_account_type: 'نوع الحساب',
    dashboard_active_requests: 'الطلبات النشطة',
    dashboard_received_quotes: 'الاقتباسات المستلمة',
    dashboard_coming_features: 'الميزات القادمة',
    dashboard_feature_1: 'إضافة طلبات جديدة',
    dashboard_feature_2: 'عرض الاقتباسات',
    dashboard_feature_3: 'إدارة الموردين',
    dashboard_feature_4: 'تتبع الطلبات',
  },
  en: {
    // Home
    home_title: 'BuildPro - Pricing Platform',
    home_subtitle: 'Welcome to BuildPro',
    home_login: 'Login',
    home_signup: 'Create Account',
    
    // Login
    login_title: 'Login',
    login_email: 'Email',
    login_password: 'Password',
    login_button: 'Login',
    login_no_account: "Don't have an account?",
    login_create: 'Create one',
    login_success: 'Login successful!',
    login_wrong_password: 'Wrong password!',
    login_email_not_found: 'Email not found!',
    
    // Signup
    signup_title: 'Create New Account',
    signup_name: 'Name',
    signup_email: 'Email',
    signup_password: 'Password',
    signup_type: 'Account Type',
    signup_contractor: 'Contractor',
    signup_supplier: 'Supplier',
    signup_button: 'Register',
    signup_have_account: 'Already have an account?',
    signup_login: 'Login',
    signup_success: 'Registration successful!',
    
    // Dashboard
    dashboard_title: 'Dashboard',
    dashboard_logout: 'Logout',
    dashboard_welcome: 'Welcome',
    dashboard_email: 'Email',
    dashboard_account_type: 'Account Type',
    dashboard_active_requests: 'Active Requests',
    dashboard_received_quotes: 'Received Quotes',
    dashboard_coming_features: 'Coming Features',
    dashboard_feature_1: 'Add New Requests',
    dashboard_feature_2: 'View Quotes',
    dashboard_feature_3: 'Manage Suppliers',
    dashboard_feature_4: 'Track Orders',
  }
};

export const getTranslation = (key: string, lang: 'ar' | 'en') => {
  return (translations[lang] as any)[key] || key;
};
export const saudiCities = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'الظهران',
  'الإحساء',
  'الجبيل',
  'القطيف',
  'ينبع',
  'الليث',
  'رابغ',
  'أملج',
  'تبوك',
  'الوجه',
  'ضباء',
  'حائل',
  'بريدة',
  'الرس',
  'عنيزة',
  'الدوادمي',
  'الزلفي',
  'المجمعة',
  'الطائف',
  'الجموم',
  'الكامل',
  'نجران',
  'شروورة',
  'خميس مشيط',
  'أبها',
  'بيشة',
  'الباحة',
  'المخواة',
  'القنفذة',
  'الدرب',
  'سكاكا',
  'دومة الجندل',
  'العويقيلة',
  'الجوف'
];

export const getCityName = (city: string, language: 'ar' | 'en') => {
  if (language === 'ar') {
    return city;
  }
  
  // ترجمة بسيطة للمدن الرئيسية
  const cityTranslations: { [key: string]: string } = {
    'الرياض': 'Riyadh',
    'جدة': 'Jeddah',
    'مكة المكرمة': 'Makkah',
    'المدينة المنورة': 'Madinah',
    'الدمام': 'Dammam',
    'الخبر': 'Khobar',
    'الظهران': 'Dhahran',
    'الإحساء': 'Ahsa',
    'الجبيل': 'Jubail',
    'القطيف': 'Qatif',
    'ينبع': 'Yanbu',
    'الليث': 'Leith',
    'رابغ': 'Rabigh',
    'أملج': 'Umluj',
    'تبوك': 'Tabuk',
    'الوجه': 'Al Wajh',
    'ضباء': 'Duba',
    'حائل': 'Hail',
    'بريدة': 'Buraydah',
    'الرس': 'Ar Rass',
    'عنيزة': 'Unaizah',
    'الدوادمي': 'Ad Dawadimi',
    'الزلفي': 'Az Zulfi',
    'المجمعة': 'Al Majmaah',
    'الطائف': 'Taif',
    'الجموم': 'Al Jumum',
    'الكامل': 'Al Kamil',
    'نجران': 'Najran',
    'شروورة': 'Sharurah',
    'خميس مشيط': 'Khamis Mushait',
    'أبها': 'Abha',
    'بيشة': 'Bisha',
    'الباحة': 'Al Bahah',
    'المخواة': 'Al Mikhwah',
    'القنفذة': 'Qunfudhah',
    'الدرب': 'Ad Darb',
    'سكاكا': 'Sakakah',
    'دومة الجندل': 'Dumat Al Jandal',
    'العويقيلة': 'Al Owaiqliah',
    'الجوف': 'Al Jouf'
  };
  
  return cityTranslations[city] || city;
};
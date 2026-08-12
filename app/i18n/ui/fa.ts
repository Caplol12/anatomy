import type { UiDictionary } from "../types";

export const ui: UiDictionary = {
  meta: {
    title: "Anatomy Atelier — یادگیری آناتومی مثل یک هنرمند",
    description: "کاوش در اعضای سه‌بعدی با جزئیات دقیق پزشکی — قلب، مغز، ریه، کبد، کلیه، چشم، روده، پانکراس و پوست — در یک کارگاه آناتومی تعاملی و فاخر.",
    ogTitle: "Anatomy Atelier — یادگیری آناتومی مثل یک هنرمند",
    ogDescription: "آناتومی را مثل یک هنرمند از طریق نمونه‌های سه‌بعدی تعاملی و پرجزئیات پزشکی بیاموزید.",
    imageAlt: "نمونه‌ی تشریحی قلب معلق بالای پایه، در کنار نشان‌واره‌ی Anatomy Atelier"
  },
  brand: {
    tagline: "یادگیری آناتومی مثل یک هنرمند",
    home: "صفحه‌ی اصلی Anatomy Atelier"
  },
  nav: {
    explore: "کاوش",
    systems: "دستگاه‌ها",
    lessons: "درس‌ها",
    library: "کتابخانه",
    notes: "یادداشت‌ها"
  },
  search: {
    placeholder: "جستجوی اندام‌ها، موضوعات…"
  },
  profile: {
    open: "باز کردن پروفایل فراگیر"
  },
  language: {
    label: "زبان",
    choose: "انتخاب زبان"
  },
  library: {
    title: "کتابخانه‌ی اندام‌ها",
    open: "باز کردن کتابخانه‌ی اندام‌ها",
    close: "بستن کتابخانه",
    saved: "اندام‌های ذخیره‌شده",
    viewAll: "مشاهده‌ی همه اندام‌ها",
    quoteLine1: "یادگیری",
    quoteLine2: "جلوه‌ای از حس کنجکاوی است.",
    quoteSign: "به کاوش ادامه دهید!"
  },
  tools: {
    label: "ابزارهای نمایشگر سه‌بعدی",
    rotate: "چرخش",
    zoom: "بزرگ‌نمایی",
    isolate: "جداسازی",
    section: "برش عرضی",
    layers: "لایه‌ها",
    compare: "مقایسه",
    reset: "بازنشانی"
  },
  viewer: {
    title: "نمایشگر تعاملی {organ}",
    canvas: "مدل سه‌بعدی تعاملی آناتومی. برای چرخش بکشید، برای زوم چرخک را بچرخانید و برای خواندن توضیحات روی هر نقطه کلیک کنید.",
    tip: "راهنما",
    tipDrag: "برای چرخش بکشید",
    tipScroll: "برای زوم چرخک را بچرخانید",
    tipClick: "برای اطلاعات بیشتر روی نقطه کلیک کنید",
    loading: "در حال آماده‌سازی {organ}",
    autoRotate: "چرخش خودکار",
    caption: "نمونه‌ی سه‌بعدی · روی نقطه کلیک کنید",
    structures: "ساختارهای موجود در این نمونه"
  },
  info: {
    kicker: "{organ}",
    keyFacts: "حقایق کلیدی",
    size: "اندازه",
    weight: "وزن",
    daily: "روزانه",
    location: "موقعیت",
    bloodSupply: "خون‌رسانی",
    function: "عملکرد",
    medical: "اهمیت پزشکی",
    didYouKnow: "آیا می‌دانستید",
    viewLesson: "مشاهده درس",
    animate: "پویانمایی",
    quiz: "آزمون",
    compare: "مقایسه"
  },
  compare: {
    title: "مقایسه‌ی اندام‌ها",
    comparing: "در حال مقایسه",
    reference: "مرجع",
    primaryRole: "نقش اصلی",
    scale: "مقیاس",
    vs: "در برابر",
    close: "بستن مقایسه"
  },
  cards: {
    resources: "منابع آموزشی {organ}",
    microscopic: "نمای میکروسکوپی",
    compareOrgans: "مقایسه‌ی اندام‌ها",
    functionAnimation: "پویانمایی عملکرد",
    clinicalNotes: "نکات بالینی",
    whereItWorks: "محل فعالیت",
    commonConditions: "بیماری‌های شایع",
    exploreTissue: "کاوش بافت",
    openComparison: "باز کردن مقایسه",
    playAnimation: "پخش پویانمایی",
    seeAll: "مشاهده‌ی همه",
    seeSystem: "مشاهده‌ی دستگاه",
    playAria: "پخش پویانمایی عملکرد {organ}",
    systemAria: "مشاهده‌ی موقعیت {organ} در بدن"
  },
  quiz: {
    start: "شروع آزمون برچسب‌گذاری",
    find: "پیدا کنید:",
    progress: "{current} از {total}",
    correct: "درست است",
    wrong: "کاملاً درست نیست",
    reveal: "این بخش {label} است",
    answer: "{label} با رنگ سبز مشخص شده است",
    done: "پایان آزمون",
    score: "{score} از {total} درست",
    retry: "تلاش مجدد",
    exit: "خروج از آزمون",
    hint: "روی نقطه مربوطه در مدل کلیک کنید"
  },
  modal: {
    guided: "کشف هدایت‌شده",
    close: "بستن",
    continueExploring: "ادامه کاوش",
    quizTitle: "آزمون سریع: {organ}",
    motionTitle: "{organ} در حرکت",
    bodyTitle: "{organ} در بدن",
    insideTitle: "نگاهی به درون {organ}",
    quizPrompt: "کدام عبارت، بهترین توصیف برای {organ} است؟",
    quizA: "نقشی تخصصی در حفظ تعادل و پایداری بدن ایفا می‌کند",
    quizB: "به صورت کاملاً مستقل و بی‌ارتباط کار می‌کند",
    quizC: "تنها هنگام خواب فعال است",
    lessonBody: "ساختارهای برجسته‌شده را دنبال کنید، نمونه را بچرخانید و ارتباط فرم با عملکرد را درک کنید. این مطالعه‌ی کوتاه برای ساخت یک مدل ذهنی ماندگار طراحی شده است.",
    systemIntro: "{location}. مسیر ارتباطی {organ} با سایر بخش‌های بدن را دنبال کنید.",
    system: "دستگاه",
    primaryRole: "نقش اصلی",
    bloodSupply: "خون‌رسانی"
  }
};

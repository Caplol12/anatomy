# i18n Development Rules & Workflow

## Internationalization (i18n) Workflow

برای افزودن متن جدید به پروژه:
1. اجرای دستور اضافه کردن کلید:
   `npm run i18n:add-key -- --path="modal.newField" --value="Default English text"`
   یا برای محتوای ارگان:
   `npm run i18n:add-key -- --organ="heart" --path="funFact" --value="..."`
2. سپس برای هر زبان ترجمه‌ی واقعی را بنویسید (به‌صورت دستی در فایل‌های `app/i18n/ui/<locale>.ts` و `app/i18n/organs/<locale>.ts` یا با استفاده از `npm run i18n:export` و `npm run i18n:import -- --locale=<locale> --file=<path>`).
3. و در پایان `npm run i18n:audit` را اجرا کنید.

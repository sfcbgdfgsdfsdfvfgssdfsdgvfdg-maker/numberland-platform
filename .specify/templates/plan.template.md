# 📐 نقشه فنی و معماری: [نام ویژگی] (Technical Plan)
> **شناسه:** `PLAN-XXX`  
> **وابسته به سند:** `FEAT-XXX (spec.md)`

---

## ۱. تغییرات دیتابیس (Schema & Migrations)
- جدول جدید یا ستون‌های اضافه‌شده:
  ```sql
  -- کدهای DDL در Neon PostgreSQL
  ```
- مقداردهی پیش‌فرض و مقادیر Seed.

---

## ۲. قرارداد APIها (API Contracts)
| روش | مسیر (Endpoint) | دسترسی | ورودی (Body / Query) | خروجی (Response) |
|---|---|---|---|---|
| `POST` | `/api/...` | User / Admin | `{ ... }` | `{ success: true, ... }` |

---

## ۳. تغییرات فرانت‌اند (UI & State)
- کامپوننت‌های جدید یا اصلاح‌شده:
- متغیرهای وضعیت (State Management):
- مدیریت خطا و نمایش به کاربر با اعلان (Toast).

---

## ۴. ریسک‌ها و راهکارهای کاهش ریسک (Risks & Mitigations)
- ریسک همزمانی (Race Condition): ...
- ریسک امنیتی یا حملات تکراری: ...

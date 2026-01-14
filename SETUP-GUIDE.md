# Tenderix Setup Guide - תיקון מהיר

## הבעיה
האתר לא מאפשר להעלות מסמכים כי ה-Storage Bucket לא מוגדר כראוי.

---

## שלב 1: יצירת Storage Bucket

1. כנס ל-Supabase Dashboard:
   https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu

2. לחץ על **Storage** בתפריט השמאלי

3. לחץ **New Bucket**

4. הגדרות:
   - **Name**: `tender-documents`
   - **Public bucket**: ✅ YES (מסומן)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: (השאר ריק לכל הסוגים)

5. לחץ **Create bucket**

---

## שלב 2: הוספת Storage Policies

1. בדשבורד Supabase, לחץ על **SQL Editor**

2. העתק והרץ את הקוד הבא:

```sql
-- Storage Policies for tender-documents
CREATE POLICY "Anyone can view tender-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tender-documents');

CREATE POLICY "Anyone can upload to tender-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'tender-documents');

CREATE POLICY "Anyone can update tender-documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'tender-documents');

CREATE POLICY "Anyone can delete from tender-documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'tender-documents');
```

3. לחץ **Run**

---

## שלב 3: הוספת טבלאות חסרות (אופציונלי)

אם יש שגיאות על טבלאות חסרות, הרץ את:
`sql/002_missing_tables_and_storage.sql`

---

## שלב 4: בדיקה

1. פתח את: http://localhost:3000/tenderix-dashboard.html
2. לחץ על "מכרז חדש"
3. גרור קובץ PDF
4. לחץ "התחל ניתוח"

---

## פתרון בעיות

### שגיאה: "Bucket not found"
- וודא שיצרת את ה-bucket בשם המדויק: `tender-documents`
- וודא שהוא מוגדר כ-Public

### שגיאה: "Permission denied"
- הרץ את ה-Storage Policies ב-SQL Editor
- וודא שאין policies קיימים שחוסמים

### שגיאה: "new row violates row-level security"
- הרץ את ה-RLS Policies מ-`sql/002_missing_tables_and_storage.sql`

---

## קישורים

- **Supabase Dashboard**: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu
- **n8n Dashboard**: https://daviderez.app.n8n.cloud

---

## SQL Files

| קובץ | תיאור |
|------|-------|
| `sql/MASTER_MIGRATION.sql` | כל הטבלאות הבסיסיות |
| `sql/002_missing_tables_and_storage.sql` | 7 טבלאות חסרות + RLS |
| `sql/003_storage_setup.sql` | Storage Policies |
| `sql/storage-policies.sql` | גיבוי policies |

-- Add test data for workflow testing

-- 1. Create missing tables first (run quick-fix.sql first if not done)

-- 2. Add a test company profile
INSERT INTO company_profiles (user_id, company_name)
VALUES (NULL, 'Test Company Ltd')
ON CONFLICT DO NOTHING;

-- 3. Add test tender document with sample gate conditions text
INSERT INTO tender_documents (tender_id, file_name, document_type, extracted_text, created_at)
VALUES (
    '8c982353-78ea-479b-a31c-e1316cce15f2',
    'tender_requirements.pdf',
    'requirements',
    'תנאי סף למכרז:

1. ניסיון מוכח: על המציע להציג ניסיון של לפחות 5 שנים בתחום
2. מחזור כספי: מחזור שנתי של לפחות 10 מיליון ש"ח
3. אישור ISO: נדרש אישור ISO 9001 בתוקף
4. ערבות בנקאית: יש להמציא ערבות בנקאית בסך 100,000 ש"ח
5. רישיון קבלן: רישום בפנקס הקבלנים בסיווג מתאים
6. ביטוח: ביטוח אחריות מקצועית בסך 5 מיליון ש"ח לפחות
7. כוח אדם: צוות של לפחות 20 עובדים מקצועיים
8. הסמכות: הסמכה מטעם משרד הביטחון - יתרון

דרישות טכניות:
- יכולת לספק שירות 24/7
- מערכת ניהול פרויקטים מתקדמת
- צי רכבים של לפחות 5 כלי רכב',
    NOW()
)
ON CONFLICT DO NOTHING;

SELECT 'Test data added!' as status;

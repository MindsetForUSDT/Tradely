// lib/exportPdf.ts — БЕЗОПАСНЫЙ ЭКСПОРТ
export function exportToPdf(elementId: string, filename = 'report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  // ✅ Клонируем и очищаем элемент
  const clone = element.cloneNode(true) as HTMLElement;

  // ✅ Удаляем все скрипты и обработчики событий
  const scripts = clone.querySelectorAll('script');
  scripts.forEach((s) => s.remove());

  // ✅ Удаляем инлайн-обработчики
  const allElements = clone.querySelectorAll('*');
  allElements.forEach((el) => {
    const attributes = [...el.attributes];
    attributes.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // ✅ Санитизация HTML
  const sanitizedHTML = clone.outerHTML
    .replace(/javascript:/gi, '') // Удаляем javascript: ссылки
    .replace(/<iframe/gi, '&lt;iframe') // Блокируем iframe
    .replace(/<embed/gi, '&lt;embed') // Блокируем embed
    .replace(/<object/gi, '&lt;object'); // Блокируем object

  // Собираем стили безопасно
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  const stylesHtml = Array.from(styles)
    .map((s) => s.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Popup blocked');
    return;
  }

  // ✅ Используем безопасный шаблон
  const safeTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(filename)}</title>
        ${stylesHtml}
        <style>
          body { 
            background: #0A0A0A; 
            color: white; 
            padding: 20px; 
            font-family: Inter, -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 16px 0; 
          }
          th, td { 
            padding: 8px 12px; 
            text-align: left; 
            border-bottom: 1px solid #2A2A2A; 
          }
          th { 
            color: #6B7280; 
            font-size: 12px; 
            text-transform: uppercase; 
          }
          .print-only { display: block; }
          .no-print { display: none; }
          @media print {
            body { background: white; color: black; }
            th { color: #666; }
            td, th { border-bottom-color: #ccc; }
          }
        </style>
      </head>
      <body>
        ${sanitizedHTML}
        <script>
          // Безопасный вызов печати
          (function() {
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500); // Задержка для загрузки стилей
            };
          })();
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(safeTemplate);
  printWindow.document.close();
}

// ✅ Хелпер экранирования HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

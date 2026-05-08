export function exportToPdf(elementId: string, filename = 'report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Создаём окно для печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  let stylesHtml = '';
  styles.forEach((s) => {
    stylesHtml += s.outerHTML;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${filename}</title>
        ${stylesHtml}
        <style>
          body { background: #0A0A0A; color: white; padding: 20px; font-family: Inter, sans-serif; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #2A2A2A; }
          th { color: #6B7280; font-size: 12px; text-transform: uppercase; }
          .print-only { display: block; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

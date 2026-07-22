function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** تقليل أحرف غير صالحة في أسماء الملفات */
export function sanitizePdfFileName(name: string): string {
  const base = name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .split('\0')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'document';
}

/**
 * يصوّر HTML كاملاً (بعد تحميل الخطوط قدر الإمكان) ويحفظه كملف PDF؛
 * يقسّم المحتوى الطويل على صفحات A4.
 */
export async function saveHtmlStringAsPdf(html: string, filename: string): Promise<boolean> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'pdf-render-frame';
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:840px;height:100vh;border:0;opacity:0;pointer-events:none;z-index:-1';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;

  try {
    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      if (doc.readyState === 'complete') {
        queueMicrotask(done);
        return;
      }
      iframe.addEventListener('load', done, { once: true });
    });

    await sleep(450);
    try {
      await doc.fonts?.ready;
    } catch {
      /* ignore */
    }
    await sleep(200);

    const body = doc.body;
    if (!body || body.scrollHeight < 4) {
      return false;
    }

    const w = Math.max(body.scrollWidth, body.offsetWidth, 720);
    const h = Math.max(body.scrollHeight, body.offsetHeight);

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#fbf9f5',
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(name);
    return true;
  } catch {
    return false;
  } finally {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  }
}

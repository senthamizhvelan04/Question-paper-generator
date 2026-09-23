/**
 * Extract text from a PDF file in the browser using pdf.js loaded dynamically from CDN.
 */
export async function extractTextFromPdf(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);

        // Dynamically load pdf.js if it's not present on the window
        if (!window.pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = async () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            try {
              const text = await parsePdfData(typedarray);
              resolve(text);
            } catch (err) {
              reject(err);
            }
          };
          script.onerror = () => reject(new Error('Failed to load PDF parsing library from CDN.'));
          document.head.appendChild(script);
        } else {
          const text = await parsePdfData(typedarray);
          resolve(text);
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function parsePdfData(typedarray) {
  const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  // Check if text is suspiciously short (e.g., less than 20 chars per page on average)
  const averageCharsPerPage = pdf.numPages > 0 ? (fullText.trim().length / pdf.numPages) : 0;
  if (averageCharsPerPage < 20) {
    throw new Error("This PDF appears to be scanned/image-based — please upload a text-based PDF or paste the content directly.");
  }

  return fullText;
}

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found`);
    return;
  }

  // Force scroll element to top so everything is visible
  const originalScrollTop = element.scrollTop;
  element.scrollTop = 0;

  // Temporarily find and hide any elements that shouldn't be printed
  const hiddenElements = element.querySelectorAll('.print\\:hidden, .no-print');
  const originalDisplayValues: string[] = [];
  hiddenElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    originalDisplayValues.push(htmlEl.style.display);
    htmlEl.style.display = 'none';
  });

  try {
    // We add a class or style to standardise background and padding for PDF capture
    const originalStyle = element.getAttribute('style') || '';
    // Set white background, RTL, and padding for optimal PDF layout
    element.setAttribute('style', originalStyle + '; background-color: #ffffff !important; color: #000000 !important; font-family: sans-serif;');

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 1200,
    });

    // Restore original styles
    element.setAttribute('style', originalStyle);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 standard width in mm
    const pageHeight = 297; // A4 standard height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Add subsequent pages if the content overflows A4 height
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error during PDF conversion:', error);
  } finally {
    // Restore hidden elements display
    hiddenElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.display = originalDisplayValues[index];
    });
    element.scrollTop = originalScrollTop;
  }
}

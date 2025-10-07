const puppeteer = require('puppeteer');

async function testMinimalPDF() {
  console.log('🧪 Testing minimal PDF generation...');
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Very simple HTML
    const html = `
      <html>
        <body>
          <h1>Test</h1>
          <p>Simple test</p>
        </body>
      </html>
    `;
    
    await page.setContent(html);
    console.log('✅ Content set');
    
    // Wait using setTimeout instead of waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Wait completed');
    
    const pdf = await page.pdf({ format: 'A4' });
    console.log('✅ PDF generated, size:', pdf.length);
    
    await browser.close();
    console.log('🎉 Minimal test PASSED!');
    
  } catch (error) {
    console.error('❌ Minimal test FAILED:', error.message);
    console.error('Full error:', error);
  }
}

testMinimalPDF();





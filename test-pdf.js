const puppeteer = require('puppeteer');

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation...');
  
  try {
    // Test browser launch
    console.log('📱 Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      timeout: 30000
    });
    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();
    console.log('✅ New page created');

    // Set timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    console.log('✅ Timeouts set');

    // Test simple HTML content
    const testHTML = `
      <html>
        <head>
          <title>Test PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Test PDF Generation</h1>
          <p>This is a test PDF to verify Puppeteer is working correctly.</p>
          <p>Student: Test User</p>
          <p>Score: 100/100</p>
        </body>
      </html>
    `;

    console.log('📄 Setting content...');
    await page.setContent(testHTML, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('✅ Content loaded');

    // Wait for content to render
    console.log('⏳ Waiting for content to render...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Wait completed');

    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      timeout: 30000
    });
    console.log('✅ PDF generated, buffer size:', pdfBuffer.length);

    // Validate PDF buffer
    if (pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    // Save test PDF
    const fs = require('fs');
    fs.writeFileSync('test-output.pdf', pdfBuffer);
    console.log('✅ Test PDF saved as test-output.pdf');

    await browser.close();
    console.log('✅ Browser closed');
    console.log('🎉 PDF generation test PASSED!');

  } catch (error) {
    console.error('❌ PDF generation test FAILED:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testPDFGeneration();





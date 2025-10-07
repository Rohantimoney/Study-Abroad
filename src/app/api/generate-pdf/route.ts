import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  try {
    const results = await request.json()
    console.log('📄 PDF Generation - Received data:', JSON.stringify(results, null, 2))
    
    // Validate required fields
    if (!results['Student Name'] && !results.studentName) {
      console.error('❌ Missing Student Name in PDF data')
      return NextResponse.json({ error: 'Missing student name' }, { status: 400 })
    }
    
    // Simple browser configuration
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      timeout: 30000
    })
    
    const page = await browser.newPage()
    
    // Set page timeout
    page.setDefaultTimeout(30000) // 30 second timeout
    page.setDefaultNavigationTimeout(30000)
    
    // Generate HTML content for the PDF
    const htmlContent = generateHTMLContent(results)
    console.log('📄 Generated HTML content length:', htmlContent.length)
    
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    console.log('📄 Page content loaded successfully')
    
    // Wait for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate PDF with error handling
    let pdfBuffer: Buffer | Uint8Array;
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 30000 // 30 second timeout for PDF generation
      })
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError);
      await browser.close();
      
      // Return a simple text response as fallback
      return new NextResponse(`
        <html>
          <head><title>Study Abroad Report - ${results['Student Name'] || results.studentName}</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Study Abroad Readiness Report</h1>
            <h2>Student: ${results['Student Name'] || results.studentName}</h2>
            <p><strong>Overall Readiness Index:</strong> ${results['Overall Readiness Index'] || 'N/A'}</p>
            <p><strong>Readiness Level:</strong> ${results['Readiness Level'] || 'Needs Assessment'}</p>
            <h3>Strengths:</h3>
            <p>${results.Strengths || 'No strengths identified'}</p>
            <h3>Recommendations:</h3>
            <p>${results.Recommendations || 'No recommendations provided'}</p>
            <p><em>Note: This is a simplified report. For detailed analysis, please retry PDF generation.</em></p>
          </body>
        </html>
      `, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="study-abroad-report-${(results['Student Name'] || results.studentName).replace(/\s+/g, '-').toLowerCase()}.html"`
        }
      });
    }
    
    console.log('📄 PDF generated, buffer size:', pdfBuffer.length)
    
    // Validate PDF buffer
    if (pdfBuffer.length === 0) {
      console.error('❌ PDF buffer is empty');
      await browser.close();
      return NextResponse.json({ error: 'PDF generation failed - empty buffer' }, { status: 500 });
    }
    
    await browser.close()
    
    console.log('📄 Returning PDF response with size:', pdfBuffer.length)
    
    // Return PDF as response - use Response constructor for binary data
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="psychometric-report-${(results['Student Name'] || results.studentName).replace(/\s+/g, '-').toLowerCase()}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function generateHTMLContent(results: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get data from new LLM format
  const studentName = results['Student Name'] || results.studentName || 'Student';
  const scores = results.Scores || {};
  const overallIndex = results['Overall Readiness Index'] || 0;
  const readinessLevel = results['Readiness Level'] || 'Needs Assessment';
  const strengths = results.Strengths || 'No strengths identified';
  const gaps = results.Gaps || 'No gaps identified';
  const recommendations = results.Recommendations || 'No recommendations provided';
  const countryFit = results['Country Fit (Top 3)'] || [];

  // Helper to generate compact score card
  const generateScoreCard = (label: string, score: number, weight: string) => {
    const percentage = Math.round(score);
    const barClass = percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'average' : 'weak';
    
    return `
      <div class="score-card">
        <h4>${label}</h4>
        <div class="score-value">${percentage}%</div>
        <div class="score-bar">
          <div class="score-fill ${barClass}" style="width: ${percentage}%"></div>
        </div>
        <div style="font-size: 0.7em; color: #666; margin-top: 4px;">Weight: ${weight}</div>
      </div>
    `;
  };

  // Helper to generate compact country card
  const generateCountryCard = (country: string, index: number) => {
    const countryInfo = {
      'Singapore': { flag: '🇸🇬' },
      'Ireland': { flag: '🇮🇪' },
      'Netherlands': { flag: '🇳🇱' },
      'Canada': { flag: '🇨🇦' },
      'Australia': { flag: '🇦🇺' },
      'United Kingdom': { flag: '🇬🇧' },
      'Germany': { flag: '🇩🇪' },
      'United States': { flag: '🇺🇸' },
      'India': { flag: '🇮🇳' },
      'United Arab Emirates': { flag: '🇦🇪' }
    };
    
    const info = countryInfo[country] || { flag: '🌍' };
    
    return `
      <div class="country-card">
        <div class="country-rank">#${index + 1}</div>
        <div class="country-flag">${info.flag}</div>
        <div class="country-name">${country}</div>
        <div class="country-score">${Math.round(100 - (index * 15))}% Match</div>
      </div>
    `;
  };

  // Helper to generate recommendation sections
  const generateRecommendationSection = (title: string, items: string[], icon: string) => `
    <div class="recommendation-section">
      <div class="recommendation-header">
        <span class="recommendation-icon">${icon}</span>
        <h4>${title}</h4>
      </div>
      <div class="recommendation-content">
        ${items.map((item, index) => `
          <div class="recommendation-item">
            <span class="item-number">${index + 1}</span>
            <span class="item-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>D-Vivid Consultant - Study Abroad Assessment Report</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Poppins', sans-serif;
                line-height: 1.4;
                color: #333;
                background: #ffffff;
                margin: 0;
                padding: 0;
                font-size: 12px;
            }
            
            .page {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: #ffffff;
                position: relative;
                padding: 0;
            }
            
            .header {
                background: linear-gradient(135deg, #003B8C 0%, #5BE49B 100%);
                color: white;
                padding: 15px 20px;
                text-align: center;
                position: relative;
                overflow: hidden;
                height: 80px;
            }
            
            .header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
            }
            
            .logo-section {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .logo {
                width: 50px;
                height: 50px;
                background: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            .logo img {
                max-width: 80%;
                max-height: 80%;
            }
            
            .company-info h1 {
                font-family: 'Montserrat', sans-serif;
                font-size: 1.8em;
                font-weight: 800;
                margin: 0;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            
            .company-info p {
                font-size: 0.9em;
                opacity: 0.95;
                margin: 0;
                font-weight: 500;
            }
            
            .report-title {
                text-align: center;
                flex: 1;
            }
            
            .report-title h2 {
                font-size: 1.4em;
                font-weight: 700;
                margin: 0;
            }
            
            .report-title p {
                font-size: 0.8em;
                opacity: 0.9;
                margin: 2px 0 0 0;
            }
            
            .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #003B8C 0%, #5BE49B 100%);
                color: white;
                padding: 8px 20px;
                text-align: center;
                font-size: 0.8em;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .footer-logo {
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-right: 8px;
            }
            
            .footer-logo img {
                max-width: 70%;
                max-height: 70%;
            }
            
            .content {
                padding: 20px;
                min-height: calc(297mm - 110px);
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .student-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .info-item {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid #5BE49B;
            }
            
            .info-label {
                font-weight: 700;
                color: #666;
                margin-bottom: 4px;
                font-size: 0.8em;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .info-value {
                font-size: 1.1em;
                font-weight: 800;
                color: #003B8C;
            }
            
            .overall-score {
                text-align: center;
                margin: 15px 0;
                padding: 20px;
                background: linear-gradient(45deg, #003B8C, #5BE49B);
                color: white;
                border-radius: 10px;
            }
            
            .overall-score h3 {
                font-size: 2.5em;
                margin-bottom: 8px;
                font-weight: 800;
            }
            
            .overall-score p {
                font-size: 1.2em;
                opacity: 0.95;
                font-weight: 600;
            }
            
            .scores-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 15px 0;
            }
            
            .score-card {
                background: #ffffff;
                padding: 15px;
                border-radius: 10px;
                border: 2px solid #e0e0e0;
                text-align: center;
            }
            
            .score-card h4 {
                font-size: 1em;
                color: #003B8C;
                font-weight: 700;
                margin-bottom: 8px;
            }
            
            .score-value {
                font-size: 2em;
                font-weight: 800;
                color: #003B8C;
                margin-bottom: 5px;
            }
            
            .score-bar {
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 5px;
            }
            
            .score-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .score-fill.excellent { background: linear-gradient(90deg, #22C55E, #16A34A); }
            .score-fill.good { background: linear-gradient(90deg, #3B82F6, #2563EB); }
            .score-fill.average { background: linear-gradient(90deg, #F59E0B, #D97706); }
            .score-fill.weak { background: linear-gradient(90deg, #EF4444, #DC2626); }
            
            .analysis-section {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #003B8C;
                margin: 10px 0;
            }
            
            .analysis-section h4 {
                font-size: 1.1em;
                color: #003B8C;
                margin-bottom: 8px;
                font-weight: 700;
            }
            
            .analysis-section p {
                line-height: 1.5;
                color: #555;
                font-size: 0.9em;
            }
            
            .country-fit {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 15px 0;
            }
            
            .country-card {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                border: 2px solid #e0e0e0;
            }
            
            .country-rank {
                background: linear-gradient(45deg, #003B8C, #5BE49B);
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 8px auto;
                font-weight: 800;
                font-size: 0.9em;
            }
            
            .country-flag {
                font-size: 1.5em;
                margin-bottom: 5px;
            }
            
            .country-name {
                font-size: 1em;
                font-weight: 700;
                color: #003B8C;
                margin-bottom: 5px;
            }
            
            .country-score {
                background: linear-gradient(45deg, #5BE49B, #4ade80);
                color: white;
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 0.8em;
            }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page { box-shadow: none; border: none; }
                .header, .footer { background-color: #003B8C !important; }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="header-content">
                    <div class="logo-section">
                        <div class="logo">
                            <img src="https://iili.io/Jp021xX.png" alt="D-Vivid Logo"/>
                        </div>
                        <div class="company-info">
                            <h1>D-Vivid Consultant</h1>
                            <p>Strategic Counselling Circle</p>
                        </div>
                    </div>
                    <div class="report-title">
                        <h2>Study Abroad Assessment Report</h2>
                        <p>Comprehensive Readiness Index (CRI)</p>
                    </div>
                </div>
            </div>
            
            <div class="content">
                <div class="student-info">
                    <div class="info-item">
                        <div class="info-label">Student Name</div>
                        <div class="info-value">${studentName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Assessment Date</div>
                        <div class="info-value">${currentDate}</div>
                    </div>
                </div>
                
                <div class="overall-score">
                    <h3>${overallIndex}%</h3>
                    <p>Overall Readiness Index: ${readinessLevel}</p>
                </div>
                
                <div class="scores-grid">
                    ${scores['Financial Planning'] ? generateScoreCard('Financial Planning', scores['Financial Planning'], '25%') : ''}
                    ${scores['Academic Readiness'] ? generateScoreCard('Academic Readiness', scores['Academic Readiness'], '20%') : ''}
                    ${scores['Career Alignment'] ? generateScoreCard('Career Alignment', scores['Career Alignment'], '20%') : ''}
                    ${scores['Personal & Cultural'] ? generateScoreCard('Personal & Cultural', scores['Personal & Cultural'], '15%') : ''}
                    ${scores['Practical Readiness'] ? generateScoreCard('Practical Readiness', scores['Practical Readiness'], '10%') : ''}
                    ${scores['Support System'] ? generateScoreCard('Support System', scores['Support System'], '10%') : ''}
                </div>
                
                <div class="analysis-section">
                    <h4>💪 Key Strengths</h4>
                    <p>${strengths}</p>
                </div>
                
                <div class="analysis-section">
                    <h4>⚠️ Areas for Development</h4>
                    <p>${gaps}</p>
                </div>
                
                <div class="analysis-section">
                    <h4>🎯 Strategic Recommendations</h4>
                    <p>${recommendations}</p>
                </div>
                
                ${countryFit.length > 0 ? `
                <div class="country-fit">
                    <h4 style="grid-column: 1/-1; text-align: center; color: #003B8C; margin-bottom: 10px;">🌍 Recommended Study Destinations</h4>
                    ${countryFit.map((country: string, index: number) => generateCountryCard(country, index)).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <div style="display: flex; align-items: center;">
                    <div class="footer-logo">
                        <img src="https://iili.io/Jp021xX.png" alt="D-Vivid Logo"/>
                    </div>
                    <span>D-Vivid Consultant - Strategic Counselling Circle</span>
                </div>
                <div>Report Generated: ${currentDate}</div>
            </div>
        </div>
    </body>
    </html>
  `;
}

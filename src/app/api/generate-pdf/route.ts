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
    return new Response(pdfBuffer as any, {
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
  const studentEmail = results['Student Email'] || results.studentEmail || results.userEmail || 'student@example.com';
  const studentPhone = results['Student Phone'] || results.studentPhone || results.userPhone || '+91 XXXXX XXXXX';
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

  // Helper to generate radar chart
  const generateRadarChart = (scores: any) => {
    const categories = [
      { name: 'Financial Planning', score: scores['Financial Planning'] || 0 },
      { name: 'Academic Readiness', score: scores['Academic Readiness'] || 0 },
      { name: 'Career Alignment', score: scores['Career Alignment'] || 0 },
      { name: 'Personal & Cultural', score: scores['Personal & Cultural'] || 0 },
      { name: 'Practical Readiness', score: scores['Practical Readiness'] || 0 },
      { name: 'Support System', score: scores['Support System'] || 0 }
    ];
    
    return categories.map(category => `
      <div class="radar-item">
        <div class="radar-label">${category.name}</div>
        <div class="radar-score">${category.score}%</div>
      </div>
    `).join('');
  };

  // Helper to generate trend chart
  const generateTrendChart = (scores: any) => {
    const categories = [
      { name: 'Financial', score: scores['Financial Planning'] || 0 },
      { name: 'Academic', score: scores['Academic Readiness'] || 0 },
      { name: 'Career', score: scores['Career Alignment'] || 0 },
      { name: 'Cultural', score: scores['Personal & Cultural'] || 0 },
      { name: 'Practical', score: scores['Practical Readiness'] || 0 },
      { name: 'Support', score: scores['Support System'] || 0 }
    ];
    
    return categories.map(category => `
      <div class="trend-bar">
        <div class="trend-label">${category.name}</div>
        <div class="trend-progress">
          <div class="trend-fill" style="width: ${category.score}%"></div>
        </div>
        <div class="trend-value">${category.score}%</div>
      </div>
    `).join('');
  };

  // Helper to generate country matrix
  const generateCountryMatrix = (countries: string[]) => {
    const countryDescriptions = {
      'Singapore': 'Strong academic support, proximity to India, structured environment',
      'Ireland': 'English-speaking, EU benefits, growing tech sector',
      'Germany': 'Free education, strong engineering programs, EU access',
      'Canada': 'Multicultural, post-graduation work permits, quality education',
      'Australia': 'English-speaking, strong research programs, work opportunities',
      'United Kingdom': 'Prestigious universities, strong Indian diaspora, global recognition',
      'United States': 'Top universities, research opportunities, diverse programs',
      'India': 'Domestic options, cost-effective, familiar environment',
      'United Arab Emirates': 'Growing education sector, proximity, business opportunities',
      'Netherlands': 'English programs, EU benefits, innovative education'
    };
    
    return countries.map((country, index) => {
      const description = (countryDescriptions as any)[country] || 'Good study destination with quality education';
      const matchScore = Math.round(100 - (index * 15));
      
      return `
        <div class="country-matrix-item">
          <div class="country-matrix-rank">#${index + 1}</div>
          <div class="country-matrix-name">${country}</div>
          <div class="country-matrix-score">${matchScore}% Match</div>
          <div class="country-matrix-desc">${description}</div>
        </div>
      `;
    }).join('');
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
    
    const info = (countryInfo as any)[country] || { flag: '🌍' };
    
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
                line-height: 1.5;
                color: #333;
                background: #ffffff;
                margin: 0;
                padding: 0;
                font-size: 16px;
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
                padding: 12px 20px;
                text-align: center;
                position: relative;
                overflow: hidden;
                height: 90px;
                min-height: 90px;
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
                line-height: 1.1;
            }
            
            .company-info p {
                font-size: 0.95em;
                opacity: 0.95;
                margin: 0;
                font-weight: 500;
                line-height: 1.2;
            }
            
            .report-title {
                text-align: center;
                flex: 1;
            }
            
            .report-title h2 {
                font-size: 1.3em;
                font-weight: 700;
                margin: 0;
                line-height: 1.1;
                padding: 0 5px;
            }
            
            .report-title p {
                font-size: 0.85em;
                opacity: 0.9;
                margin: 2px 0 0 0;
                padding: 0 5px;
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
                font-size: 1.0em;
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
                font-size: 1.0em;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .info-value {
                font-size: 1.3em;
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
                font-size: 3.0em;
                margin-bottom: 8px;
                font-weight: 800;
            }
            
            .overall-score p {
                font-size: 1.4em;
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
                font-size: 1.2em;
                color: #003B8C;
                font-weight: 700;
                margin-bottom: 8px;
            }
            
            .score-value {
                font-size: 2.4em;
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
                font-size: 1.3em;
                color: #003B8C;
                margin-bottom: 8px;
                font-weight: 700;
            }
            
            .analysis-section p {
                line-height: 1.6;
                color: #555;
                font-size: 1.1em;
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
                font-size: 1.1em;
            }
            
            .country-flag {
                font-size: 1.8em;
                margin-bottom: 5px;
            }
            
            .country-name {
                font-size: 1.2em;
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
                font-size: 1.0em;
            }
            
            .charts-section {
                margin: 20px 0;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #003B8C;
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .chart-container {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .chart-container.full-width {
                grid-column: 1 / -1;
            }
            
            .chart-container h4 {
                color: #003B8C;
                font-size: 1.2em;
                font-weight: 700;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .radar-chart {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .radar-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: linear-gradient(90deg, #f8f9fa, #e9ecef);
                border-radius: 6px;
                border-left: 4px solid #5BE49B;
            }
            
            .radar-label {
                font-weight: 600;
                color: #333;
                font-size: 0.9em;
            }
            
            .radar-score {
                font-weight: 700;
                color: #003B8C;
                font-size: 1.1em;
            }
            
            .trend-chart {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .trend-bar {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .trend-label {
                width: 120px;
                font-size: 0.9em;
                font-weight: 600;
                color: #555;
            }
            
            .trend-progress {
                flex: 1;
                height: 20px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .trend-fill {
                height: 100%;
                border-radius: 10px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
                transition: width 0.3s ease;
            }
            
            .trend-value {
                font-weight: 700;
                color: #003B8C;
                font-size: 0.9em;
                min-width: 40px;
                text-align: right;
            }
            
            .country-matrix {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .country-matrix-item {
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #e0e0e0;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .country-matrix-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #003B8C, #5BE49B);
            }
            
            .country-matrix-rank {
                background: linear-gradient(45deg, #003B8C, #5BE49B);
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px auto;
                font-weight: 800;
                font-size: 1.0em;
            }
            
            .country-matrix-name {
                font-size: 1.1em;
                font-weight: 700;
                color: #003B8C;
                margin-bottom: 8px;
            }
            
            .country-matrix-score {
                background: linear-gradient(45deg, #5BE49B, #4ade80);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 0.9em;
                display: inline-block;
            }
            
            .country-matrix-desc {
                font-size: 0.8em;
                color: #666;
                margin-top: 8px;
                line-height: 1.4;
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
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
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
                        <div class="info-label">Student Email</div>
                        <div class="info-value">${studentEmail}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Phone Number</div>
                        <div class="info-value">${studentPhone}</div>
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
                
                <div class="charts-section">
                    <h3 style="text-align: center; color: #003B8C; margin: 20px 0; font-size: 1.5em; font-weight: 700;">📊 Detailed Readiness Analysis</h3>
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>🎯 Readiness Radar Chart</h4>
                            <div class="radar-chart">
                                ${generateRadarChart(scores)}
                            </div>
                        </div>
                        <div class="chart-container">
                            <h4>📈 Performance Trends</h4>
                            <div class="trend-chart">
                                ${generateTrendChart(scores)}
                            </div>
                        </div>
                    </div>
                    <div class="chart-container full-width">
                        <h4>🌍 Country Readiness Matrix</h4>
                        <div class="country-matrix">
                            ${generateCountryMatrix(countryFit)}
                        </div>
                    </div>
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
                               <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAxNkgxNlYyNEgxMlYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAxNkgyOFYyNEgyNFYxNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiAxMkgyNFYxNkgxNlYxMloiIGZpbGw9IndoaXRlIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0MCIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDNCOEMiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUJFOEI5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+" alt="D-Vivid Logo"/>
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

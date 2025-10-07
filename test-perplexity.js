const { exec } = require('child_process');
const fs = require('fs');

async function testPerplexityAPI() {
  console.log('🧪 Testing Perplexity API Integration...');
  
  const testData = {
    userName: "Test User Perplexity",
    overallScore: 88,
    topicScoresArray: [
      { name: "Academic Readiness", correct: 4, total: 4 },
      { name: "Cultural Adaptability", correct: 3, total: 4 },
      { name: "Financial Planning", correct: 2, total: 3 },
      { name: "Language Proficiency", correct: 3, total: 3 }
    ]
  };

  // Write test data to file
  fs.writeFileSync('perplexity-test-data.json', JSON.stringify(testData, null, 2));
  
  console.log('📄 Perplexity test data written to perplexity-test-data.json');
  console.log('📡 Testing Perplexity API route...');
  
  // Use curl to test the Perplexity API
  const curlCommand = `curl -X POST http://localhost:3001/api/analyze-results -H "Content-Type: application/json" -d @perplexity-test-data.json -o perplexity-test-output.json -w "HTTP Status: %{http_code}\\nResponse Time: %{time_total}s\\n"`;
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Perplexity test failed:', error.message);
      return;
    }
    
    console.log('📊 Curl output:', stdout);
    if (stderr) console.log('📊 Curl stderr:', stderr);
    
    // Check if response was created
    if (fs.existsSync('perplexity-test-output.json')) {
      const stats = fs.statSync('perplexity-test-output.json');
      console.log('✅ Response file created, size:', stats.size, 'bytes');
      
      if (stats.size > 0) {
        const content = fs.readFileSync('perplexity-test-output.json', 'utf8');
        console.log('📄 Response content:', content.substring(0, 500) + '...');
        
        try {
          const response = JSON.parse(content);
          if (response.analysis && response.analysis.readinessBand) {
            console.log('🎉 Perplexity API is working! Readiness Band:', response.analysis.readinessBand);
            console.log('📊 Overall Assessment:', response.analysis.overallAssessment);
            
            // Check if this is LLM-generated or fallback
            const assessment = response.analysis.overallAssessment || '';
            const hasScore = assessment.includes('88') || assessment.includes('88/100');
            const hasPersonalized = assessment.includes('your') || assessment.includes('Test User Perplexity');
            
            console.log('\n🤖 Perplexity LLM Detection:');
            console.log('✅ Contains score reference:', hasScore);
            console.log('✅ Contains personalized language:', hasPersonalized);
            console.log('✅ Assessment length:', assessment.length, 'characters');
            
            if (hasScore && hasPersonalized && assessment.length > 50) {
              console.log('🎉 CONFIRMED: This is Perplexity LLM-generated content!');
            } else {
              console.log('⚠️ WARNING: This appears to be fallback data, not Perplexity LLM-generated');
            }
          } else {
            console.log('⚠️ Perplexity API returned data but no analysis found');
          }
        } catch (e) {
          console.log('❌ Response is not valid JSON:', e.message);
        }
      } else {
        console.log('❌ Response file is empty');
      }
    } else {
      console.log('❌ Response file was not created');
    }
  });
}

testPerplexityAPI();

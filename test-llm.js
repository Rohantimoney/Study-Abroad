const { exec } = require('child_process');
const fs = require('fs');

async function testLLMAPI() {
  console.log('🧪 Testing LLM API directly...');
  
  const testData = {
    userName: "Test User",
    overallScore: 85,
    topicScoresArray: [
      { name: "Academic Readiness", correct: 3, total: 4 },
      { name: "Cultural Adaptability", correct: 2, total: 3 }
    ]
  };

  // Write test data to file
  fs.writeFileSync('llm-test-data.json', JSON.stringify(testData, null, 2));
  
  console.log('📄 LLM test data written to llm-test-data.json');
  console.log('📡 Testing LLM API route...');
  
  // Use curl to test the LLM API
  const curlCommand = `curl -X POST http://localhost:3000/api/analyze-results -H "Content-Type: application/json" -d @llm-test-data.json -o llm-test-output.json -w "HTTP Status: %{http_code}\\nResponse Time: %{time_total}s\\n"`;
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ LLM test failed:', error.message);
      return;
    }
    
    console.log('📊 Curl output:', stdout);
    if (stderr) console.log('📊 Curl stderr:', stderr);
    
    // Check if response was created
    if (fs.existsSync('llm-test-output.json')) {
      const stats = fs.statSync('llm-test-output.json');
      console.log('✅ Response file created, size:', stats.size, 'bytes');
      
      if (stats.size > 0) {
        const content = fs.readFileSync('llm-test-output.json', 'utf8');
        console.log('📄 Response content:', content.substring(0, 500) + '...');
        
        try {
          const response = JSON.parse(content);
          if (response.analysis && response.analysis.readinessBand) {
            console.log('🎉 LLM API is working! Readiness Band:', response.analysis.readinessBand);
          } else {
            console.log('⚠️ LLM API returned data but no analysis found');
          }
        } catch (e) {
          console.log('❌ Response is not valid JSON');
        }
      } else {
        console.log('❌ Response file is empty');
      }
    } else {
      console.log('❌ Response file was not created');
    }
  });
}

testLLMAPI();



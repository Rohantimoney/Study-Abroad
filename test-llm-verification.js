const { exec } = require('child_process');
const fs = require('fs');

async function testLLMVerification() {
  console.log('🧪 Testing LLM Verification with Sample Data...');
  
  // Create a specific test case that should generate unique LLM responses
  const testData = {
    userName: "Alex Johnson",
    overallScore: 92, // High score to test LLM response
    topicScoresArray: [
      { name: "Academic Readiness", correct: 4, total: 4 },
      { name: "Cultural Adaptability", correct: 3, total: 3 },
      { name: "Financial Planning", correct: 2, total: 3 },
      { name: "Language Proficiency", correct: 3, total: 3 }
    ]
  };

  // Write test data to file
  fs.writeFileSync('llm-verification-data.json', JSON.stringify(testData, null, 2));
  
  console.log('📄 LLM verification data written to llm-verification-data.json');
  console.log('📡 Testing LLM API with high score (92)...');
  
  // Use curl to test the LLM API
  const curlCommand = `curl -X POST http://localhost:3000/api/analyze-results -H "Content-Type: application/json" -d @llm-verification-data.json -o llm-verification-output.json -w "HTTP Status: %{http_code}\\nResponse Time: %{time_total}s\\n"`;
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ LLM verification test failed:', error.message);
      return;
    }
    
    console.log('📊 Curl output:', stdout);
    if (stderr) console.log('📊 Curl stderr:', stderr);
    
    // Check if response was created
    if (fs.existsSync('llm-verification-output.json')) {
      const stats = fs.statSync('llm-verification-output.json');
      console.log('✅ Response file created, size:', stats.size, 'bytes');
      
      if (stats.size > 0) {
        const content = fs.readFileSync('llm-verification-output.json', 'utf8');
        console.log('📄 Full Response:');
        console.log(content);
        
        try {
          const response = JSON.parse(content);
          
          // Check if this is LLM-generated or fallback
          console.log('\n🔍 LLM Verification Analysis:');
          console.log('📊 Readiness Band:', response.analysis?.readinessBand);
          console.log('📊 Overall Assessment:', response.analysis?.overallAssessment);
          console.log('📊 Strengths Count:', response.analysis?.strengths?.length);
          console.log('📊 Weaknesses Count:', response.analysis?.weaknesses?.length);
          console.log('📊 Recommendations Count:', response.analysis?.specificRecommendations?.length);
          
          // Check for LLM-specific indicators
          const assessment = response.analysis?.overallAssessment || '';
          const hasScore = assessment.includes('92') || assessment.includes('92/100');
          const hasPersonalized = assessment.includes('Alex Johnson') || assessment.includes('your');
          
          console.log('\n🤖 LLM Detection:');
          console.log('✅ Contains score reference:', hasScore);
          console.log('✅ Contains personalized language:', hasPersonalized);
          console.log('✅ Assessment length:', assessment.length, 'characters');
          
          if (hasScore && hasPersonalized && assessment.length > 50) {
            console.log('🎉 CONFIRMED: This is LLM-generated content, not fallback!');
          } else {
            console.log('⚠️ WARNING: This appears to be fallback data, not LLM-generated');
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

testLLMVerification();



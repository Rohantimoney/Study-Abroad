const { exec } = require('child_process');
const fs = require('fs');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete PDF Generation Flow...');
  
  const completeTestData = {
    studentName: "Test User",
    studentEmail: "test@example.com",
    studentClass: "12",
    studentSchool: "Test School",
    score: 85,
    maxScore: 100,
    totalTime: 30,
    topics: [
      { name: "Academic Readiness", correct: 3, total: 4 },
      { name: "Career & Goal Alignment", correct: 2, total: 3 },
      { name: "Financial Planning", correct: 2, total: 3 },
      { name: "Personal & Cultural Readiness", correct: 3, total: 4 }
    ],
    careerInterests: [
      { name: "Technology & Innovation", score: 8 },
      { name: "Business & Management", score: 7 },
      { name: "Research & Academia", score: 6 }
    ],
    aptitudeScores: [
      { name: "Academic Readiness", score: 8 },
      { name: "Cultural Adaptability", score: 7 },
      { name: "Career Clarity", score: 6 }
    ],
    skills: [
      { name: "Language Learning", score: 85 },
      { name: "Financial Planning", score: 80 },
      { name: "Cultural Adaptability", score: 75 }
    ],
    academicRecommendations: ["Advanced Mathematics", "English Literature", "Research Methods"],
    examRecommendations: ["IELTS", "SAT", "GRE"],
    upskillingRecommendations: ["Communication Skills", "Leadership", "Cultural Awareness"],
    extracurricularRecommendations: ["Student Council", "Debate Club", "International Exchange"],
    analysis: {
      readinessBand: "Good",
      overallAssessment: "You show good potential for study abroad with some areas for improvement.",
      strengths: ["Strong academic foundation", "Good communication skills", "Clear career goals"],
      weaknesses: ["Cultural adaptability", "Financial planning", "Language proficiency"],
      specificRecommendations: [
        "Improve cultural awareness through international programs",
        "Develop financial planning skills",
        "Practice English conversation regularly",
        "Join international student groups",
        "Take cultural sensitivity training"
      ]
    }
  };

  // Write complete test data to file
  fs.writeFileSync('complete-test-data.json', JSON.stringify(completeTestData, null, 2));
  
  console.log('📄 Complete test data written to complete-test-data.json');
  console.log('📡 Testing API route with complete data...');
  
  // Use curl to test the API
  const curlCommand = `curl -X POST http://localhost:3001/api/generate-pdf -H "Content-Type: application/json" -d @complete-test-data.json -o complete-test-output.pdf -w "HTTP Status: %{http_code}\\nResponse Time: %{time_total}s\\n"`;
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Curl test failed:', error.message);
      return;
    }
    
    console.log('📊 Curl output:', stdout);
    if (stderr) console.log('📊 Curl stderr:', stderr);
    
    // Check if PDF was created
    if (fs.existsSync('complete-test-output.pdf')) {
      const stats = fs.statSync('complete-test-output.pdf');
      console.log('✅ PDF file created, size:', stats.size, 'bytes');
      
      if (stats.size > 1000) {
        console.log('🎉 Complete test PASSED! PDF generated successfully with proper size.');
        console.log('📄 You can open complete-test-output.pdf to verify the content.');
      } else {
        console.log('❌ PDF file is too small (likely an error response)');
        const content = fs.readFileSync('complete-test-output.pdf', 'utf8');
        console.log('📄 Content:', content);
      }
    } else {
      console.log('❌ PDF file was not created');
    }
  });
}

testCompleteFlow();




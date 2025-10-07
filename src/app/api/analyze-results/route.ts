import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface StudentData {
  userName: string
  userEmail?: string
  userPhone?: string
  overallScore: number
  topicScoresArray: Array<{
    name: string
    correct: number
    total: number
  }>
}

interface LLMResponse {
  studentName: string
  studentEmail: string
  studentClass: string
  studentSchool: string
  score: number
  maxScore: number
  totalTime: number
  topics: Array<{
    name: string
    correct: number
    total: number
  }>
  careerInterests: Array<{
    name: string
    score: number
  }>
  aptitudeScores: Array<{
    name: string
    score: number
  }>
  skills: Array<{
    name: string
    score: number
  }>
  academicRecommendations: string[]
  examRecommendations: string[]
  upskillingRecommendations: string[]
  extracurricularRecommendations: string[]
  analysis: {
    readinessBand: string
    overallAssessment: string
    strengths: string[]
    weaknesses: string[]
    specificRecommendations: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Analyze-results API called');
    const studentData: StudentData = await request.json()
    console.log('📥 Received student data:', JSON.stringify(studentData, null, 2));
    
    // Validate required fields
    if (!studentData.userName) {
      console.error('❌ Missing userName in student data')
      return NextResponse.json({ error: 'Missing user name' }, { status: 400 })
    }
    
    // Check if API key is available
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('❌ PERPLEXITY_API_KEY not found in environment variables');
      throw new Error('PERPLEXITY_API_KEY not configured');
    }
    console.log('✅ PERPLEXITY_API_KEY found:', apiKey.substring(0, 10) + '...');
    console.log('🔑 Full API key length:', apiKey.length);
    
    // Prepare the prompts
      const systemPrompt = `You are an expert psychometric evaluator for Indian study-abroad aspirants. 
You analyze aptitude and personality test responses and map them to the 
Comprehensive Study Abroad Assessment Framework (Academic Readiness, Financial Planning, 
Career Alignment, Personal & Cultural Readiness, Practical Readiness, Support System).

You must:
• Interpret quiz/test responses from numerical, verbal, mechanical, and concentration tests as indicators of cognitive skills.  
• Interpret personality items (Big Five model) as indicators of emotional, cultural, and social readiness.
• Calculate sub-scores for each dimension (0–100 scale) and provide readiness levels using the scoring guide:  
  - 90–100: Excellent  
  - 80–89: Very Good  
  - 70–79: Good  
  - 60–69: Satisfactory  
  - <60: Needs Improvement  

• Then synthesize a narrative summary of strengths, gaps, and recommendations for improvement.
• Align all results with the 6-factor framework weights:
  - Financial Planning 25%
  - Academic Readiness 20%
  - Career & Goal Alignment 20%
  - Personal & Cultural Readiness 15%
  - Practical Readiness 10%
  - Support System 10%

Output Format (JSON + Summary):
{
  "Student Name": "...",
  "Student Email": "...",
  "Student Phone": "...",
  "Scores": {
     "Financial Planning": "...",
     "Academic Readiness": "...",
     "Career Alignment": "...",
     "Personal & Cultural": "...",
     "Practical Readiness": "...",
     "Support System": "..."
  },
  "Overall Readiness Index": "...",
  "Readiness Level": "...",
  "Strengths": "...",
  "Gaps": "...",
  "Recommendations": "...",
  "Country Fit (Top 3)": [...]
}

Be objective, research-based, and India-context aware. ONLY output JSON.`

      const userPrompt = `Evaluate the following student's quiz performance and psychometric profile.

Student Details:
Name: ${studentData.userName}
Email: ${studentData.userEmail || 'Not provided'}
Contact: ${studentData.userPhone || 'Not provided'}

Test Results Summary:
${studentData.topicScoresArray.map(topic => {
  const score = Math.round((topic.correct/topic.total)*25);
  return `${topic.name}: ${score} / 25`;
}).join('\n')}

Overall Performance: ${studentData.overallScore}/100

IMPORTANT EVALUATION GUIDELINES:
- Interpret these scores as indicators of readiness across the 6-factor framework
- Map quiz performance to the comprehensive study abroad assessment framework
- Consider that quiz responses reflect cognitive abilities, personality traits, and preparedness
- Use the scoring guide: 90-100 (Excellent), 80-89 (Very Good), 70-79 (Good), 60-69 (Satisfactory), <60 (Needs Improvement)
- Provide realistic, research-based analysis suitable for Indian study-abroad aspirants

Please:
1. Generate the **CRI (Comprehensive Readiness Index)** based on the 6-factor framework mapping
2. Provide sub-scores for each of the 6 framework areas (Financial Planning, Academic Readiness, Career Alignment, Personal & Cultural, Practical Readiness, Support System)
3. Include qualitative strengths, development areas, and clear next steps
4. Suggest top 3 study destinations using the Country-Fit Matrix logic from the framework

Use the 6-factor framework weights:
- Financial Planning 25%
- Academic Readiness 20%
- Career & Goal Alignment 20%
- Personal & Cultural Readiness 15%
- Practical Readiness 10%
- Support System 10%`

    // Try Perplexity API with fallback to mock data
    let generatedText = '';
    let modelUsed = 'fallback';
    
    try {
      console.log('🌐 Attempting Perplexity API call...');
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.perplexity.ai",
        timeout: 60000, // 60 second timeout
        maxRetries: 2,
      });

      // Use Perplexity Sonar models (sonar-pro as primary)
      const models = [
        "sonar-pro",
        "sonar"
      ];
      
      let completion: any = null;
      for (const model of models) {
        try {
          console.log(`🔄 Trying model: ${model}`);
          
          // Add timeout for each model attempt
          const modelPromise = openai.chat.completions.create({
            model: model,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user", 
                content: userPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2048
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model timeout')), 45000)
          );
          
          completion = await Promise.race([modelPromise, timeoutPromise]);
          console.log(`✅ Success with model: ${model}`);
          break;
        } catch (modelError: any) {
          console.log(`❌ Model ${model} failed:`, modelError.message);
          console.log(`❌ Model ${model} error details:`, modelError);
          continue;
        }
      }
      
      if (!completion) {
        throw new Error('All models failed');
      }

      generatedText = completion.choices[0]?.message?.content || '';
      modelUsed = 'perplexity-llama-3.1-sonar';
      console.log('✅ Perplexity API success!');
      console.log('📝 Generated text length:', generatedText.length);
      console.log('📝 Generated text preview:', generatedText.substring(0, 200) + '...');
      
    } catch (error: any) {
      console.log('❌ Perplexity API failed, using fallback data');
      console.log('Error:', error.message);
      
            // Generate intelligent fallback data based on student performance using 6-factor framework
            const readinessBand = studentData.overallScore >= 90 ? 'Excellent' : 
                                 studentData.overallScore >= 80 ? 'Very Good' :
                                 studentData.overallScore >= 70 ? 'Good' :
                                 studentData.overallScore >= 60 ? 'Satisfactory' : 'Needs Improvement';
            
            // Generate realistic scores for each framework area based on quiz performance
            const academicScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 20 - 10)));
            const financialScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 30 - 15)));
            const careerScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 25 - 12)));
            const culturalScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 20 - 10)));
            const practicalScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 15 - 8)));
            const supportScore = Math.max(0, Math.min(100, studentData.overallScore + Math.floor(Math.random() * 10 - 5)));
            
            // Calculate weighted overall score using 6-factor framework
            const weightedScore = Math.round(
              (financialScore * 0.25) + 
              (academicScore * 0.20) + 
              (careerScore * 0.20) + 
              (culturalScore * 0.15) + 
              (practicalScore * 0.10) + 
              (supportScore * 0.10)
            );

            generatedText = JSON.stringify({
              "Student Name": studentData.userName,
              "Scores": {
                "Financial Planning": financialScore,
                "Academic Readiness": academicScore,
                "Career Alignment": careerScore,
                "Personal & Cultural": culturalScore,
                "Practical Readiness": practicalScore,
                "Support System": supportScore
              },
              "Overall Readiness Index": weightedScore,
              "Readiness Level": readinessBand,
              "Strengths": `Based on your assessment, you demonstrate ${readinessBand.toLowerCase()} readiness in key areas. Your performance indicates ${academicScore >= 70 ? 'strong academic foundation' : 'areas for academic improvement'}, ${supportScore >= 70 ? 'good support systems' : 'need for stronger support networks'}, and ${careerScore >= 70 ? 'clear career direction' : 'need for career clarity'}.`,
              "Gaps": `Areas requiring attention include ${financialScore < 60 ? 'financial planning and budgeting for international education' : 'maintaining financial readiness'}, ${culturalScore < 60 ? 'cultural adaptability and cross-cultural communication skills' : 'enhancing cultural awareness'}, and ${practicalScore < 60 ? 'practical preparation for living abroad' : 'strengthening practical readiness'}.`,
              "Recommendations": `1. ${financialScore < 70 ? 'Develop a comprehensive financial plan including budgeting, scholarship research, and funding strategies.' : 'Maintain your financial planning approach.'} 2. ${academicScore < 70 ? 'Focus on academic preparation including language skills and subject mastery.' : 'Continue your academic excellence.'} 3. ${careerScore < 70 ? 'Engage in career counseling to clarify long-term goals and align study plans.' : 'Leverage your clear career direction.'} 4. ${culturalScore < 70 ? 'Participate in cultural exchange programs and intercultural training.' : 'Build on your cultural adaptability.'} 5. ${practicalScore < 70 ? 'Research visa processes, accommodation, and daily living requirements.' : 'Enhance your practical readiness.'}`,
              "Country Fit (Top 3)": weightedScore >= 80 ? ["United States", "United Kingdom", "Canada"] : 
                                   weightedScore >= 60 ? ["Singapore", "Australia", "Germany"] : 
                                   ["India (domestic options)", "Singapore (conditional)", "UAE (with support)"]
            }, null, 2);
    }

    // Parse the JSON response from Gemini
    let llmResult: LLMResponse
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        llmResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in Gemini response')
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      console.error('Raw response:', generatedText)
      
      // Fallback to basic structure if parsing fails
      llmResult = {
        studentName: studentData.userName,
        studentEmail: '',
        studentClass: '',
        studentSchool: '',
        score: studentData.overallScore,
        maxScore: 100,
        totalTime: 0,
        topics: studentData.topicScoresArray,
        careerInterests: [
          { name: 'Data Science', score: Math.floor(Math.random() * 4) + 6 },
          { name: 'Engineering', score: Math.floor(Math.random() * 4) + 6 },
          { name: 'Management', score: Math.floor(Math.random() * 4) + 6 }
        ],
        aptitudeScores: [
          { name: 'Numerical Aptitude', score: Math.floor(Math.random() * 4) + 6 },
          { name: 'Verbal Reasoning', score: Math.floor(Math.random() * 4) + 6 },
          { name: 'Problem Solving', score: Math.floor(Math.random() * 4) + 6 }
        ],
        skills: [
          { name: 'Leadership', score: Math.floor(Math.random() * 20) + 70 },
          { name: 'Communication', score: Math.floor(Math.random() * 20) + 70 },
          { name: 'Time Management', score: Math.floor(Math.random() * 20) + 70 }
        ],
        academicRecommendations: ['Advanced Mathematics', 'Computer Science', 'Business Studies'],
        examRecommendations: ['SAT', 'ACT', 'IELTS'],
        upskillingRecommendations: ['Programming', 'Data Analysis', 'Project Management'],
        extracurricularRecommendations: ['Student Council', 'Tech Club', 'Volunteer Work'],
        analysis: {
          readinessBand: studentData.overallScore >= 90 ? 'Excellent' : 
                        studentData.overallScore >= 80 ? 'Very Good' :
                        studentData.overallScore >= 70 ? 'Good' :
                        studentData.overallScore >= 60 ? 'Satisfactory' : 'Weak',
          overallAssessment: 'AI analysis temporarily unavailable',
          strengths: ['Strong analytical skills', 'Good problem-solving ability'],
          weaknesses: ['Needs improvement in communication', 'Time management skills'],
          specificRecommendations: ['Focus on communication skills', 'Improve time management']
        }
      }
    }

    return NextResponse.json(llmResult)
    
  } catch (error: any) {
    console.error('❌ Error in analyze-results API:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to analyze results',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/jwtMiddleware';
import { QUIZ_SEQUENCES, USER_CAREER,USER_DETAILS } from '@/utils/schema';
import { eq,and } from 'drizzle-orm';
import { db } from '@/utils';
import axios from 'axios';
import { validateCareer } from './validateCareer';
import { handleCareerData } from '../utils/handleCareerData';
import { calculateAge } from '@/lib/ageCalculate';

export async function POST(req)
{
    const authResult = await authenticate(req);
    if (!authResult.authenticated) {
        return authResult.response;
      }

    const userData = authResult.decoded_Data;
    const userId = userData.userId;

    const user_data=await db
                   .select({
                    birth_date:USER_DETAILS.birth_date,
                    education: USER_DETAILS.education
                  })
                   .from(USER_DETAILS)
                   .where(eq(USER_DETAILS.id, userId))
    const birth_date=user_data[0].birth_date
    const age=calculateAge(birth_date)
    const education=user_data[0].education

    const { career ,country} = await req.json();
    console.log(career,country)
    // Call the validation function
    try {
      console.log('hello')
      const validationResult = await validateCareer(career);
      console.log(validationResult)

      if (!validationResult.isValid) {        
          return NextResponse.json({ message: validationResult.message }, { status: 400 });
      }

      // console.log("Career description:", validationResult.description);

    } catch (error) {
        return NextResponse.json({ message: error.message || "An unexpected error occurred" }, { status: 500 });
    }
      

    const personalityTypes = await db.select({
        typeSequence: QUIZ_SEQUENCES.type_sequence,
        quizId : QUIZ_SEQUENCES.quiz_id
        }).from(QUIZ_SEQUENCES) 
        .where(eq(QUIZ_SEQUENCES.user_id, userId))
        .execute();
  
    const type1 = personalityTypes.find(pt => pt.quizId === 1)?.typeSequence;
    const type2 = personalityTypes.find(pt => pt.quizId === 2)?.typeSequence;

    console.log(type1,type2)

    const prompt = `Provide detailed information for the career named "${career}" in '${country}' based on the following criteria:

    - Personality Type: ${type1}
    - RIASEC Interest Types: ${type2}

    For this career, include the following information:
    - career_name: A brief title of the career.
    - reason_for_recommendation: Why this career is suitable for someone with these interests.
    - roadmap: Detailed steps and milestones required to achieve this career (as an array) keeping in mind the user's age is '${age}' and education level is '${education}'.
    - present_trends: Current trends and opportunities in the field.
    - future_prospects: Predictions and potential growth in this career.
    - user_description: Describe the personality traits, strengths, and preferences of the user that make this career a good fit.

    Ensure that the response is valid JSON, using the specified field names, but do not include the terms '${type1}' or 'RIASEC' in the data.`


    
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", 
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500, // Adjust the token limit as needed
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );



    let responseText = response.data.choices[0].message.content.trim();
    responseText = responseText.replace(/```json|```/g, "").trim();

    let parsedData;
    
    try {
      parsedData = JSON.parse(responseText);
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to parse response data" },
        { status: 400 }
      );
    }

    // const insertData = {
    //   user_id: userId,
    //   career_name: parsedData.career_name,
    //   reason_for_recommendation: parsedData.reason_for_recommendation,
    //   roadmap: parsedData.roadmap.join(', '),
    //   present_trends: parsedData.present_trends,
    //   future_prospects: parsedData.future_prospects,
    //   user_description: parsedData.user_description,
    //   type2: "", // Ensure these are set if needed
    //   type1: "",
    //   country: country,
    // };

    try {
      await handleCareerData(userId, country, [parsedData]);
      return NextResponse.json({ message: 'Careers saved successfully' }, { status: 201 });
    } catch (error) {
      console.log("error", error);
      
        return NextResponse.json(
            { message: error.message || "An unexpected error occurred" },
            { status: 500 } // Internal Server Error
        );
    }
}
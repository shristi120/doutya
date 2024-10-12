import { NextResponse } from "next/server";
import { authenticate } from "@/lib/jwtMiddleware";
import { QUIZ_SEQUENCES, USER_DETAILS, USER_RESULTS } from "@/utils/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/utils";
import axios from "axios";

const languageOptions = {
  en: "in English",
  hi: "in Hindi",
  mar: "in Marathi",
  ur: "in Urdu",
  sp: "in Spanish",
  ben: "in Bengali",
  assa: "in Assamese",
  ge: "in German",
  mal: "in malayalam",
  tam: "in Tamil",
};
export const maxDuration = 60; // This function can run for a maximum of 5 seconds
export const dynamic = "force-dynamic";

export async function GET(req) {
  console.log("got");
  const authResult = await authenticate(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const userData = authResult.decoded_Data;
  const userId = userData.userId;

  const language = req.headers.get("accept-language") || "en";

  const url = new URL(req.url);

  const country_db = await db
    .select({
      country: USER_DETAILS.country,
      birth_date: USER_DETAILS.birth_date,
    })
    .from(USER_DETAILS)
    .where(eq(USER_DETAILS.id, userId))
    .execute();
  // console.log("country_db",country_db);
  const country = country_db[0].country; // Access the country
  let finalAge = 18;
  if (country_db.length > 0) {
    const birthDate = new Date(country_db[0].birth_date); // Access the birth date from the first result
    const today = new Date(); // Get today's date

    // Calculate age in years
    let ageInNumber = today.getFullYear() - birthDate.getFullYear();

    // Adjust for whether the birthday has occurred this year
    const hasBirthdayPassed =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() >= birthDate.getDate());

    finalAge = hasBirthdayPassed ? ageInNumber : ageInNumber - 1;

    console.log("country_db", finalAge); // Log the calculated age
  } else {
    console.log("No user found with the given ID");
  }
  const industry = url.searchParams.get("industry") || null; // Get industry from URL parameters

  // console.log("country", country);
  // console.log("industry", industry);

  // let existingResult=[];
  // if (industry == null) {
  //   existingResult = await db
  //     .select({
  //       result2: USER_RESULTS.result2
  //     })
  //     .from(USER_RESULTS)
  //     .where(
  //         and(
  //         eq(USER_RESULTS.user_id, userId),
  //         eq(USER_RESULTS.type,'basic')
  //         )
  //     )
  //     .execute();
  //   }

  if (industry == null) {
    const existingResult = await db
      .select({
        result2: USER_RESULTS.result2,
      })
      .from(USER_RESULTS)
      .where(and(eq(USER_RESULTS.user_id, userId)))
      .execute();

    // console.log(existingResult);

    if (existingResult.length > 0 && existingResult[0].result2 !== null) {
      // If result2 is already present, return it
      console.log("Returning cached result");
      return NextResponse.json(
        { result: existingResult[0].result2 },
        { status: 200 }
      );
    } else if (existingResult.length === 0) {
      return new NextResponse(null, { status: 204 });
    }
  }

  // if (industry==null && existingResult.length > 0 && existingResult[0].result2 !== null) {
  //   // If result2 is already present, return it
  //   console.log('Returning cached result');
  //   return NextResponse.json({ result: existingResult[0].result2 });
  // }

  // Get quiz sequences
  const personality2 = await db
    .select({
      typeSequence: QUIZ_SEQUENCES.type_sequence,
    })
    .from(QUIZ_SEQUENCES)
    .where(
      and(eq(QUIZ_SEQUENCES.user_id, userId), eq(QUIZ_SEQUENCES.quiz_id, 1))
    )
    .execute();

  const type2 = personality2[0].typeSequence;

  const personality1 = await db
    .select({
      typeSequence: QUIZ_SEQUENCES.type_sequence,
    })
    .from(QUIZ_SEQUENCES)
    .where(
      and(eq(QUIZ_SEQUENCES.user_id, userId), eq(QUIZ_SEQUENCES.quiz_id, 1))
    )
    .execute();

  const type1 = personality1[0].typeSequence;
  const type3 = null;

  // // Define the prompt for GPT
  // const prompt = `Provide a list of the 5 best careers in ${industry ? `the ${industry} industry in ` : ''}${country} for an individual with an ${type1} personality
  //   type and RIASEC interest types of ${type2}. For each career, include the following information:
  //     career_name: A brief title of the career.
  //     reason_for_recommendation: Why this career is suitable for someone with these interests.
  //     roadmap: Detailed steps and milestones required to achieve this career (as an array).
  //     present_trends: Current trends and opportunities in the field.
  //     future_prospects: Predictions and potential growth in this career.
  //     user_description: Describe the personality traits, strengths, and preferences of the user that make these careers a good fit.
  //   Ensure that the response is valid JSON, using the specified field names, but do not include the terms '${type1}' or 'RIASEC' in the data.`;

  const prompt = `Provide a list of the most suitable careers ${
    industry === "any" ? "" : `in the ${industry}`
  } ${
    country ? "in " + country : ""
  } for an individual with an ${type1} personality type and RIASEC interest types of ${type2} ${
    type3 ? " and Gallup Strengths types of " + type3 : ""
  }. Include 3 traditional careers, 3 trending careers, 3 offbeat careers, 3 creative careers, 3 hybrid careers, 3 sustainable and green careers, 3 social impact careers, 3 tech-driven careers, 3 experiential careers, and 3 digital and online careers. Additionally, provide ${
    finalAge >= 18
      ? "3 futuristic careers for an individual aged " +
        finalAge +
        " in the year " +
        (new Date().getFullYear() + 3)
      : "3 futuristic careers for an individual aged " +
        finalAge +
        " until they reach the age of 21."
  } Ensure that the recommended careers align at least 80% with how compatible the user is with each specific career. Do not overlap careers. For each career, include the following information:
        career_name: A brief title of the career.
        type: trending, offbeat, traditional, futuristic, normal, hybrid, creative, sustainable and green, social impact, tech-driven, experiential, digital and online.
        match: percentage of how compatible the user is with the particular career.
        
        Ensure that the response is valid JSON, strictly requiring 8 careers, using the specified field names, but do not include the terms '${type1}' in the data. Provide the response ${
    languageOptions[language] || "in English"
  }, keeping the keys in English only, but the career names should be ${
    languageOptions[language] || "in English"
  }. Present it as a single JSON data array without any wrapping other than []`;

  // console.log("prompt", prompt);

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini", // or 'gpt-4' if you have access
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5000, // Adjust the token limit as needed
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

  // Store the new result in the user_results table
  await db
    .insert(USER_RESULTS)
    .values({
      user_id: userId,
      result2: responseText,
      quiz_id: 2,
      type: industry == null ? "basic" : "advance",
      country: country,
    })
    .execute();

  // return NextResponse.json({ result: responseText });
  return NextResponse.json({ result: responseText }, { status: 200 });
}

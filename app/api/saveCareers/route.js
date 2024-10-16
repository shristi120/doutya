import { NextResponse } from "next/server";
import { db } from "@/utils";
import { eq } from "drizzle-orm/expressions";
import { authenticate } from "@/lib/jwtMiddleware";
import { QUIZ_SEQUENCES, USER_CAREER, USER_DETAILS } from "@/utils/schema";
import { saveCareer } from "../utils/saveCareer";

export const maxDuration = 40; // This function can run for a maximum of 5 seconds
export const dynamic = "force-dynamic";

export async function POST(req) {
  const authResult = await authenticate(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const userData = authResult.decoded_Data;
  const userId = userData.userId;
  const data = await req.json();
  const { results } = data;

  try {
    // Fetch user details to get the country
    const userDetails = await db
      .select()
      .from(USER_DETAILS)
      .where(eq(USER_DETAILS.id, userId))
      .execute();

    if (userDetails.length === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 } // Not Found
      );
    }

    const country = userDetails[0].country;

    const personalityTypes = await db
      .select({
        typeSequence: QUIZ_SEQUENCES.type_sequence,
        quizId: QUIZ_SEQUENCES.quiz_id,
      })
      .from(QUIZ_SEQUENCES)
      .where(eq(QUIZ_SEQUENCES.user_id, userId))
      .execute();

    const type1 = personalityTypes.find((pt) => pt.quizId === 1)?.typeSequence;
    const type2 = personalityTypes.find((pt) => pt.quizId === 2)?.typeSequence;
    console.log("results", results);

    const careerNames = results.map((item) => item.career_name);
    console.log("Career Names:", careerNames);

    // Call saveCareer and handle the response
    const existingCareers = await db
      .select()
      .from(USER_CAREER) // Assuming USER_CAREERS is the table where career data is stored
      .where(eq(USER_CAREER.user_id, userId))
      .execute();

    const isFirstTime = existingCareers.length === 0;

    if (existingCareers.length >= 5) {
      return NextResponse.json(
        { message: "Career limit reached. You can only save up to 5 careers." },
        { status: 400 } // Bad Request
      );
    }
    const saveCareerResponse = await saveCareer(
      careerNames,
      country,
      userId,
      type1,
      type2
    );
    // return NextResponse.json({ message: 'Careers saved successfully' }, { status: 201 });
    return NextResponse.json(
      { message: saveCareerResponse.message, isFirstTime },
      { status: saveCareerResponse.status }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" },
      { status: 500 } // Internal Server Error
    );
  }
}

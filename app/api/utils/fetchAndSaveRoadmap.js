import axios from 'axios';
import { db } from "@/utils"; // Ensure this path is correct
import {
    MILESTONES,
    USER_MILESTONES,
    MILESTONE_CATEGORIES,
    USER_CAREER_STATUS
} from "@/utils/schema"; // Ensure this path is correct
import { eq } from "drizzle-orm";

const languageOptions = {
    en: 'in English',
    hi: 'in Hindi',
    mar: 'in Marathi',
    ur: 'in Urdu',
    sp: 'in Spanish',
    ben: 'in Bengali',
    assa: 'in Assamese',
    ge: 'in German'
  };

export async function fetchAndSaveRoadmap(userCareerID, age, education, career, type1, type2,language) {
    console.log("userCareerID:",userCareerID, "age:",age, "education:",education, "career:",career, "type1:",type1, "type2:",type2);
    try {
        const prompt = `Provide detailed information for the career named "${career}" based on the following criteria:
        - Personality Type: ${type1}
        - RIASEC Interest Types: ${type2}
        
        For this career, include the following information:
        - career_name: A brief title of the career.
        - reason_for_recommendation: Why this career is suitable for someone with these interests.
        - present_trends: Current trends and opportunities in the field.
        - future_prospects: Predictions and potential growth in this career.
        - user_description: A narrative description of the personality traits, strengths, and preferences of the user that make this career a good fit, written in full-text format.
        - roadmap: Create a step-by-step roadmap containing academics, extracurricular activities, and other activities for a ${age}-year-old until the age of ${age + 1}-year-old aspiring to be a ${career}. The education level is '${education}'. 

        The roadmap should be broken down into intervals of every **6 months**, starting from the initial age (${age}), and include the following types of milestones:
        1. Educational Milestones
        2. Physical Milestones
        3. Mental Milestones
        4. Certification Milestones

        Each of these milestone types should have **at least three milestones**. If you have more milestones, please include them as well. Each milestone should be separated with a '|' symbol. 

        Ensure that the roadmap uses correct **half-year age intervals** (e.g., 6, 6.5, 7, 7.5, etc.) and that Certification Milestones are included and meaningful.

        The structure should follow this format for each age interval:
        {
        "age": <age>,
        "milestones": {
            "Educational Milestones": "<milestone1> | <milestone2> | <milestone3> | ...",
            "Physical Milestones": "<milestone1> | <milestone2> | <milestone3> | ...",
            "Mental Milestones": "<milestone1> | <milestone2> | <milestone3> | ...",
            "Certification Milestones": "<milestone1> | <milestone2> | <milestone3> | ..."
        }
        }

        Ensure that the response is valid JSON, using the specified field names. Provide the response ${languageOptions[language] || 'in English'}.`;


        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini", 
                messages: [{ role: "user", content: prompt }],
                max_tokens: 5000,
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
        console.log("responseText", responseText)
        let parsedData;

        try {
            parsedData = JSON.parse(responseText);
        } catch (error) {
            throw new Error("Failed to parse response data");
        }

        try {

            const milestonesForFrontend = [];  // Array to store the milestones in your desired format
            // Check if roadmap is an array and iterate over each milestone data
            if (Array.isArray(parsedData.roadmap)) {                
                for (const milestoneData of parsedData.roadmap) {
                    if (milestoneData && typeof milestoneData.age === 'number' && milestoneData.milestones) {
                        const milestoneAge = milestoneData.age;

                        for (const [category, milestones] of Object.entries(milestoneData.milestones)) {
                            const categoryResult = await db
                                .select({ id: MILESTONE_CATEGORIES.id })
                                .from(MILESTONE_CATEGORIES)
                                .where(eq(MILESTONE_CATEGORIES.name, category))
                                .execute();

                            if (categoryResult.length === 0) {
                                console.log(`Milestone category ${category} not found.`);
                                continue;
                            }

                            const categoryId = categoryResult[0].id;

                            // Split the milestones string into an array
                            const milestoneEntries = milestones.split('|')
                                .map(desc => desc.trim())
                                .filter(desc => desc && desc !== '-' && desc !== "N/A");

                            // Process each valid milestone entry
                            for (const desc of milestoneEntries) {
                                // Insert the milestone into the database
                                const insertMilestone = await db
                                    .insert(MILESTONES)
                                    .values({
                                        category_id: categoryId,
                                        description: desc,
                                        completion_status: false,
                                        date_achieved: null,
                                        milestone_age: milestoneAge
                                    })
                                    .execute();

                                const milestoneId = insertMilestone[0].insertId;
                                console.log(`Milestone milestoneId`, milestoneId, "userCareerID:", userCareerID);
                                // Link the milestone with the user career
                                await db.insert(USER_MILESTONES).values({
                                    user_career_id: userCareerID,
                                    milestone_id: milestoneId
                                }).execute();

                                 // Push to the milestones array for the frontend
                                milestonesForFrontend.push({
                                    milestoneId: milestoneId,
                                    milestoneDescription: desc,
                                    milestoneCategoryName: category,
                                    milestoneCompletionStatus: false,
                                    milestoneDateAchieved: null
                                });
                            }
                        }

                        // console.log("Milestones ready for frontend:", milestonesForFrontend);
                        return milestonesForFrontend;  // Return the milestones array for the frontend

                    } else {
                        console.error("Invalid milestone data:", milestoneData);
                        throw new Error("Invalid milestone data encountered.");
                    }
                }

                // After successful data generation, update the status to "completed"
                // await db
                //     .update(USER_CAREER_STATUS)
                //     .set({ roadmap_status: 'completed' })
                //     .where(eq(USER_CAREER_STATUS.user_career_id, userCareerID))
                //     .execute();

            } else {
                console.error("Career roadmap is not an array or is missing.");
                throw new Error("Career roadmap is not an array or is missing.");
            }

        } catch (error) {
            console.error("Error processing milestones data:", error);

             // Reset the status to "not_started" in case of an error
            //  await db
            //  .update(USER_CAREER_STATUS)
            //  .set({ roadmap_status: 'not_started' })
            //  .where(eq(USER_CAREER_STATUS.user_career_id, userCareerID))
            //  .execute();

            throw new Error("Error processing milestones data:", error);
        }
    } catch (error) {
        console.error("Error fetching or saving roadmap:", error);
         // Reset the status to "not_started" in case of an error
        //  await db
        //  .update(USER_CAREER_STATUS)
        //  .set({ roadmap_status: 'not_started' })
        //  .where(eq(USER_CAREER_STATUS.user_career_id, userCareerID))
        //  .execute();
        // Log the error without returning a response
        throw error; // Rethrow the error to be caught by the caller
    }
}

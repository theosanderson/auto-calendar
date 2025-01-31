// app/api/parse/route.js
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  const { text } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Or gpt-4
      messages: [
        {
          role: 'system',
          content: `Extract event details from text. Return a JSON object with these keys: "title", "start", "end", and "description".  
            * "start" and "end" MUST be ISO 8601 datetime strings (e.g., "2024-10-27T10:00:00Z" or "2024-10-27T10:00:00-07:00").  Include the time even if it's all-day.
            * If no time is specified, the event should be from 00:00:00 to 23:59:59 of the specified date.
            * If any field (title, start, end, or description) cannot be reasonably determined, use null as the value.
            * Ensure the JSON is valid and parsable.
            * Optionally, if you can identify the timezone, include it
            * Example:
              \`\`\`json
              {
                "title": "Meeting with John",
                "start": "2024-10-28T14:00:00-05:00",
                "end": "2024-10-28T15:00:00-05:00",
                "timezone": "America/New_York",
                "description": "Discuss project updates"
              }
              \`\`\`
          `
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    });

    const jsonResponse = completion.choices[0].message.content;

    try {
      const parsed = JSON.parse(jsonResponse);
      // Additional validation of date strings (important!)
        if (parsed.start && !isValidISO8601(parsed.start)) {
            throw new Error("Invalid 'start' date format. Must be ISO 8601.");
        }
        if (parsed.end && !isValidISO8601(parsed.end)) {
            throw new Error("Invalid 'end' date format. Must be ISO 8601.");
        }
      return new NextResponse(jsonResponse, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error("Invalid JSON returned from OpenAI:", jsonResponse, e);
      return new NextResponse(JSON.stringify({ error: `Invalid JSON or date format returned from OpenAI: ${e.message}` }), { status: 500 });
    }

  } catch (error) {
    console.error("OpenAI API Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// Helper function to check ISO 8601 date format (basic check)
function isValidISO8601(dateString) {
    try {
        new Date(dateString);
        return true;
    } catch (e) {
        return false;
    }
}
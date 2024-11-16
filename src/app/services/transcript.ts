import { Effect } from "effect";
import { HttpError } from "../types/errors";
import fs from "fs";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const transcriptPrompt = `
<prompt_objective>
transcript text from image
</prompt_objective>

<prompt_rules>
- ABSOLUTELY FORBIDDEN to include any comment or notes
- Always return text visible in the image
</prompt_rules>
`;

export const transcriptAudio = (audioPath: string) => {
  return Effect.tryPromise({
    try: async () => {
      console.log({
        audioPath,
      });

      const fileBuffer = fs.readFileSync(audioPath);
      const audioBlob = new Blob([fileBuffer]);

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.mp3");
      formData.append("model", "whisper-1");
      formData.append("response_format", "text");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.text();

      return {
        transcript: data,
        fileName: audioPath.split("/").pop() as string,
      };
    },
    catch: (e) => {
      console.log(e);
    },
  });
};

export const transcriptImage = (imagePath: string) => {
  return Effect.tryPromise({
    try: async () => {
      const fileBuffer = fs.readFileSync(imagePath);
      const base64Image = fileBuffer.toString("base64");

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: transcriptPrompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 300,
          }),
        }
      );

      const data = await response.json();

      return {
        transcript: data.choices[0].message.content as string,
        fileName: imagePath.split("/").pop() as string,
      };
    },
    catch: (e) => {
      return Effect.fail(new HttpError(e));
    },
  });
};

export const transcriptText = (textPath: string) => {
  const text = fs.readFileSync(textPath, "utf8");

  return Effect.succeed({
    transcript: text,
    fileName: textPath.split("/").pop() as string,
  });
};

export const classify = (prompt: string, fileName: string) =>
  Effect.tryPromise({
    try: async () => {
      const answerResoponse = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text = answerResoponse.response.messages[0].content[0]
        ?.text as string;

      console.log({
        fileName,
      });

      return Effect.succeed({
        classify: text as "hardware" | "people" | "0",
        fileName,
      });
    },

    catch: (e) => {
      return new HttpError(e);
    },
  });

import { HttpError } from "@/app/types/errors";
import FirecrawlApp from "@mendable/firecrawl-js";
import { Console, Effect } from "effect";

import fs from "node:fs";

import { pipe } from "effect";
import {
  transcriptImage,
  transcriptRemoteAudio,
  transcriptRemoteImage,
} from "@/app/services/transcript";
import { askAi } from "@/app/services/askAI";
import { sendReport } from "@/app/services/sendReport";

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const siteUrl = "https://centrala.ag3nts.org/dane/arxiv-draft.html";

const notesPath = process.cwd() + "/src/app/api/9/files/notes.md";

class FileError {
  readonly _tag = "FileError";
}

const generalPrompt = (context: string) => `<prompt_objective>
Answer input questions concisely in one sentence based on the given context and return the answers in the specified JSON structure.
</prompt_objective>

<prompt_rules>
- ONLY use the provided context to generate answers.
- ALWAYS ensure answers are concise, accurate, and limited to one sentence.
- Extract the question ID and associate the corresponding answer with it in the output.
- Format the output strictly in the following JSON format:
  
  {
    "01": "short answer in 1 sentence",
    "02": "short answer in 1 sentence"
  }

  If the question cannot be answered from the context, return:

  {
  "XX": "Unable to answer based on the provided context."}

  - The JSON must be formatted correctly, including the correct use of quotes and commas.
  </prompt_rules>

  <prompt_context>
  ${context}
  </prompt_context>


<prompt_output_format>

Input:

Context: "The Eiffel Tower was constructed in 1889. It is located in Paris, France."
Questions: "01=Gdzie znajduje się Wieża Eiffla? 02=W którym roku zbudowano Wieżę Eiffla?"
Output:


{
  "01": "The Eiffel Tower is located in Paris, France.",
  "02": "The Eiffel Tower was constructed in 1889."
}


  </prompt_output_format>
  

    <prompt_questions>
  01=jakiego owocu użyto podczas pierwszej próby transmisji materii w czasie?
02=Na rynku którego miasta wykonano testową fotografię użytą podczas testu przesyłania multimediów?
03=Co Bomba chciał znaleźć w Grudziądzu?
04=Resztki jakiego dania zostały pozostawione przez Rafała?
05=Od czego pochodzą litery BNW w nazwie nowego modelu językowego?
  </prompt_questions>



  
  `;

type Data = string;

const readFile = (filename: string) =>
  Effect.async<Data, FileError>((resume) => {
    fs.readFile(filename, "utf8", (error, data) => {
      if (error) {
        resume(Effect.fail(new FileError()));
      } else {
        try {
          resume(Effect.succeed(data));
        } catch (error) {
          resume(Effect.fail(new FileError()));
        }
      }
    });
  });

const writeFile = (filename: string, data: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, "utf8", (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const extractImagesAndTranscript = (fileContents: string) =>
  Effect.tryPromise({
    try: async () => {
      // Match markdown image syntax: ![alt text](image-url.png)
      const imageRegex = /!\[.*?\]\((.*?\.png)\)/g;
      const matches = [...fileContents.matchAll(imageRegex)];

      const images = matches.map((match) => match[1]);

      // Process each image and get transcriptions
      const transcriptions = await Promise.all(
        images.map(async (imagePath) => {
          const result = await transcriptRemoteImage(imagePath);
          return {
            imagePath,
            transcript: result,
          };
        })
      );

      let updatedContents = fileContents;
      transcriptions.forEach(({ imagePath, transcript }) => {
        const imageMarkdown = new RegExp(
          `!\\[.*?\\]\\(${imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
          "g"
        );
        updatedContents = updatedContents.replace(
          imageMarkdown,
          `### Image Transcription\n\n${transcript.transcript}`
        );
      });

      // Write the updated contents back to the file
      await writeFile(notesPath, updatedContents);
      return "File updated successfully";
    },
    catch: (e) => {
      return Effect.fail(e);
    },
  });

const extractAudioAndTranscript = (fileContents: string) =>
  Effect.tryPromise({
    try: async () => {
      console.log("File contents:", fileContents);

      // Updated regex for standard markdown links ending in .mp3
      const audioRegex = /\[(.*?\.mp3)\]\((.*?\.mp3)\)/;
      const match = fileContents.match(audioRegex);

      console.log("Regex match result:", match);

      // match[2] contains the URL, match[1] contains the text
      const audioPath = match?.[2];
      console.log("Audio path:", audioPath);

      if (!audioPath) {
        console.log("No audio path found");
        return "No audio files found";
      }

      const transcription = await transcriptRemoteAudio(audioPath);
      let updatedContents = fileContents;

      const audioMarkdown = new RegExp(
        `\\[.*?\\.mp3\\]\\(${audioPath.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}\\)`,
        "g"
      );
      updatedContents = updatedContents.replace(
        audioMarkdown,
        `### Audio Transcription\n\n${transcription.transcript}`
      );

      await writeFile(notesPath, updatedContents);

      return "File updated successfully";
    },
    catch: (e) => {
      console.error("Error in extractAudioAndTranscript:", e);
      return Effect.fail(e);
    },
  });

const program = pipe(
  Effect.succeed(notesPath),
  Effect.flatMap((path) => readFile(path)),
  Effect.flatMap((f) => extractImagesAndTranscript(f)),
  Effect.flatMap((f) => extractAudioAndTranscript(f)),
  Effect.flatMap((ctx) => askAi(generalPrompt(ctx))),
  Effect.flatMap((data) => sendReport(data, "arxiv")),
  Effect.tap(Console.log)
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    console.log({ data });

    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}

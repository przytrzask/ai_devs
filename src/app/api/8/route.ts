import { Effect, pipe, Console, Schema, Array, Option, Either } from "effect";

import { readdir } from "node:fs";

import { askAi } from "../../services/askAI";
import { HttpError, ValidationError } from "../../types/errors";
import { generateImage } from "@/app/services/generateImage";
import {
  classify,
  transcriptAudio,
  transcriptImage,
  transcriptText,
} from "@/app/services/transcript";
import { prompt } from "./prompt";

const API_KEY = process.env.AI_DEVS_API_KEY as string;

const reportUrl = "https://centrala.ag3nts.org/report";

const AUDIO_FILES_PATH = process.cwd() + "/src/app/api/8/files/audio";
const IMAGES_FILES_PATH = process.cwd() + "/src/app/api/8/files/images";
const TEXT_FILES_PATH = process.cwd() + "/src/app/api/8/files/texts";

export const ReportData = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});

const sendReport = (data: any) =>
  Effect.tryPromise({
    try: async () => {
      const body = JSON.stringify({
        task: "kategorie",
        apikey: API_KEY,
        answer: data,
      });

      const response = await fetch(reportUrl, {
        method: "POST",
        body,
        cache: "no-cache",
      });

      const message = await response.json();

      const validated = Schema.decodeEither(ReportData)(message);

      if (Either.isLeft(validated)) {
        throw new ValidationError();
      }

      return Effect.succeed(validated.right);
    },

    catch: (e) => {
      console.log(e);
      return new HttpError(e);
    },
  });

const getAllAudioFiles = Effect.async<string[], NodeJS.ErrnoException | null>(
  (resume) => {
    readdir(AUDIO_FILES_PATH, (error, files) => {
      if (error) {
        resume(Effect.fail(error));
      } else {
        resume(Effect.succeed(files));
      }
    });
  }
);

const getAllImages = Effect.async<string[], NodeJS.ErrnoException | null>(
  (resume) => {
    readdir(IMAGES_FILES_PATH, (error, files) => {
      if (error) {
        resume(Effect.fail(error));
      } else {
        resume(Effect.succeed(files));
      }
    });
  }
);

const getAllTextFiles = Effect.async<string[], NodeJS.ErrnoException | null>(
  (resume) => {
    readdir(TEXT_FILES_PATH, (error, files) => {
      if (error) {
        resume(Effect.fail(error));
      } else {
        console.log({
          files,
        });

        resume(Effect.succeed(files));
      }
    });
  }
);

const audioTranscriptions = pipe(
  getAllAudioFiles,
  Effect.map((files) =>
    files.map((file) =>
      transcriptAudio(`${AUDIO_FILES_PATH}/${file}`).pipe(
        Effect.map((transcription) =>
          classify(prompt(transcription.transcript), transcription.fileName)
        )
      )
    )
  ),
  Effect.flatMap((files) => Effect.all(files)),
  Effect.map((files) => Effect.all(files)),
  Effect.flatMap((files) => files)
);

const imageTranscriptions = pipe(
  getAllImages,
  Effect.map((files) =>
    files.map((file) =>
      transcriptImage(`${IMAGES_FILES_PATH}/${file}`).pipe(
        Effect.map((transcription) =>
          classify(prompt(transcription.transcript), transcription.fileName)
        )
      )
    )
  ),
  Effect.andThen((files) => Effect.all(files)),
  Effect.map((files) => Effect.all(files)),
  Effect.flatMap((files) => files)
);

const textTranscriptions = pipe(
  getAllTextFiles,
  Effect.map((files) =>
    files.map((file) => transcriptText(`${TEXT_FILES_PATH}/${file}`))
  ),
  Effect.andThen((files) => Effect.all(files)),
  Effect.map((files) =>
    files.map((file) => classify(prompt(file.transcript), file.fileName))
  ),

  Effect.andThen((files) => Effect.all(files))
);

type Acc = {
  hardware: string[];
  people: string[];
};

const program = pipe(
  Effect.all([audioTranscriptions, imageTranscriptions, textTranscriptions]),
  Effect.map(([audios, images, texts]) => [...audios, ...images, ...texts]),
  Effect.map((f) =>
    Array.reduce(f, { hardware: [], people: [] } as Acc, (acc, classified) => {
      if (classified.value.classify === "hardware") {
        acc.hardware.push(classified.value.fileName);
      } else if (classified.value.classify === "people") {
        acc.people.push(classified.value.fileName);
      }

      return acc;
    })
  ),

  Effect.tap(Console.log),
  Effect.flatMap(sendReport)
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    console.log({ data });
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}

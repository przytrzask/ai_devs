import { Document } from "./schema";

type DocumentContent = Pick<Document, "title" | "description" | "date">;

export const parseFileContent = (
  content: string,
  fileName: string
): DocumentContent => {
  const lines = content.split("\n").filter((line) => line.trim());
  return {
    title: lines[0],
    description: lines.slice(1).join("\n").trim(),
    date: parseFileName(fileName),
  };
};

const parseFileName = (fileName: string): Date => {
  const [year, month, day] = fileName.replace(".txt", "").split("_");
  return new Date(Number(year), Number(month) - 1, Number(day));
};
